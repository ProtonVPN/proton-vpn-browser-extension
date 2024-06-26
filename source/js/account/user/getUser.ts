import {isUserResult, User, UserResult} from './User';
import {fetchJson, isUnauthorizedError} from '../../api';
import {readSession} from '../readSession';
import {refreshToken} from '../refreshToken';
import {getAccessToken} from '../getAccessToken';
import {getCacheAge} from '../../tools/getCacheAge';
import {isLoggedIn, logIn} from '../../state';
import {milliSeconds} from '../../tools/milliSeconds';
import {fetchPmUser} from './getPmUser';
import {catchPromise, triggerPromise} from '../../tools/triggerPromise';
import {checkNetwork} from '../../vpn/checkNetwork';
import {storedUser} from './storedUser';
import {loadCachedUser} from './loadCachedUser';
import {getUserTTL} from '../../intervals';
import {BackgroundData} from '../../messaging/MessageType';

let tries: number[] = [];

const fetchUser = async (): Promise<User | UserResult | undefined> => {
	const user = await fetchJson<User | UserResult | undefined>('vpn/v2');

	if (user) {
		if (!isLoggedIn()) {
			logIn();
		}

		triggerPromise(storedUser.setValue(user));
	}

	return user;
};

export const loadUser = async (forceRefresh?: boolean): Promise<User | UserResult | undefined> => {
	const savedUser = await loadCachedUser();
	const age = getCacheAge(savedUser);
	const refresh = forceRefresh && (savedUser.user?.VPN.MaxTier || 0) < 1;
	const refreshInterval = getUserTTL();

	if (age < (refresh ? milliSeconds.fromSeconds(1) : refreshInterval)) {
		return savedUser?.user;
	}

	if (!refresh && age < milliSeconds.fromDays(3)) {
		triggerPromise((async () => {
			try {
				await getAccessToken();
				await fetchUser();
			} catch (e) {
				if (isUnauthorizedError(e)) {
					await refreshToken();
					await Promise.all([fetchUser(), fetchPmUser()]);

					return;
				}

				checkNetwork(e);

				throw e;
			}
		})());

		return savedUser?.user;
	}

	const now = Date.now();
	tries = tries.filter(
		time => time < now - refreshInterval,
	);
	tries.push(now);

	try {
		return await fetchUser();
	} catch (e) {
		if (savedUser?.user) {
			return savedUser.user;
		}

		throw e;
	} finally {
		if (forceRefresh) {
			triggerPromise(fetchPmUser());
		}
	}
};

const canRetry = () => {
	const now = Date.now();
	tries = tries.filter(
		time => time < now - getUserTTL(),
	);

	return tries.length < 20;
};

const calculateUser = async (tryReAuthentication = false, fresh?: boolean): Promise<User | undefined> => {
	if (!(await readSession())?.uid) {
		return undefined;
	}

	await getAccessToken(); // Get an access token if we don't have one yet

	try {
		const user = await loadUser(fresh && canRetry());

		if (user || !tryReAuthentication) {
			return isUserResult(user) ? user.User : user;
		}
	} catch (e) {
		if (!tryReAuthentication || !isUnauthorizedError(e)) {
			throw e;
		}
	}

	await refreshToken(); // Refresh the token and re-try if it expired

	const result = await loadUser();

	return isUserResult(result) ? result.User : result;
};

export const getUser = async (tryReAuthentication = false, fresh?: boolean): Promise<User | undefined> => {
	const user = await calculateUser(tryReAuthentication, fresh);

	global.browser || ((global as any).browser = chrome);

	catchPromise(browser.runtime.sendMessage({
		event: BackgroundData.USER,
		user,
	}));

	return user;
};

export const getFreshUser = (): Promise<User | undefined> => getUser(true, true);
