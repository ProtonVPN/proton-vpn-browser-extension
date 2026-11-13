'use background';
import type {User} from './User';
import {fetchJson, isUnauthorizedError} from '../../api';
import {readSession} from '../readSession';
import {refreshToken} from '../refreshToken';
import {getAccessToken} from '../getAccessToken';
import {getCacheAge} from '../../tools/getCacheAge';
import {getElapsedMillisecondsSinceLastActivity} from '../../tools/activity';
import {getRuntime} from '../../tools/getRuntime';
import {milliSeconds} from '../../tools/milliSeconds';
import {isLoggedIn, logIn} from '../../vpn/state/stateStore';
import {fetchPmUser} from './getPmUser';
import {catchPromise, triggerPromise} from '../../tools/triggerPromise';
import {checkNetwork} from '../../vpn/checkNetwork';
import {storedUser} from './storedUser';
import {loadCachedUser} from './loadCachedUser';
import {getUserMaxTier} from './getUserMaxTier';
import {
	getIdleThreshold,
	getUserBlockingUpdateTTL,
	getUserTTL,
} from '../../intervals';
import {BackgroundData} from '../../messaging/MessageType';
import {clearNotificationsCache} from '../../notifications/getNotifications';
import {clearLogicalsCache} from '../../vpn/getLogicals';

let tries: number[] = [];
let lastUserMessageDispatched = 0;

const dispatchUserDataEvent = (
	user: User | undefined,
	planChanged = false,
): void => {
	lastUserMessageDispatched = Date.now();
	catchPromise(
		getRuntime()?.sendMessage({
			event: BackgroundData.USER,
			user,
			planChanged,
		}),
	);
};

const dispatchUserDataEventIfNotYet = async (
	getUser: () => Promise<User | undefined>,
): Promise<void> => {
	const start = Date.now();
	const user = await getUser();

	// If no other user data event were dispatched
	// while waiting for the promise result
	if (lastUserMessageDispatched < start) {
		dispatchUserDataEvent(user);
	}
};

const fetchUser = async (): Promise<User | undefined> => {
	const cachedUser = await loadCachedUser();
	const prevMaxTier = getUserMaxTier(cachedUser?.user);
	const prevPlanName = cachedUser?.user?.VPN?.PlanName;

	const user = await fetchJson<User | undefined>('vpn/v2');

	if (user) {
		if (!isLoggedIn()) {
			logIn();
		}

		triggerPromise(storedUser.setValue(user));

		const currentMaxTier = getUserMaxTier(user);
		const currentPlanName = user?.VPN?.PlanName;

		// Tier or plan name differ: user's plan has changed. Drop cached notifications
		// so the next getNotifications() call is forced to re-fetch them.
		// Awaited so that callers awaiting fetchUser() (e.g. popup opening) see an empty cache.
		if (prevMaxTier !== currentMaxTier || prevPlanName !== currentPlanName) {
			await Promise.all([clearNotificationsCache(), clearLogicalsCache()]);
			dispatchUserDataEvent(user, true);
		}
	}

	return user;
};

export const loadUser = async (
	forceRefresh?: boolean,
): Promise<User | undefined> => {
	const savedUser = await loadCachedUser();
	const age = getCacheAge(savedUser);
	const refresh = forceRefresh && (savedUser.user?.VPN.MaxTier || 0) < 1;

	const idleDuration = await getElapsedMillisecondsSinceLastActivity();
	const refreshInterval =
		getUserTTL() * (idleDuration > getIdleThreshold() ? 4 : 1);

	if (age < (refresh ? milliSeconds.fromSeconds(1) : refreshInterval)) {
		return savedUser?.user;
	}

	if (!refresh && age < getUserBlockingUpdateTTL()) {
		triggerPromise(
			(async () => {
				try {
					await getAccessToken();
					await dispatchUserDataEventIfNotYet(fetchUser);
				} catch (e) {
					if (isUnauthorizedError(e)) {
						await refreshToken();
						await dispatchUserDataEventIfNotYet(
							async () => (await Promise.all([fetchUser(), fetchPmUser()]))[0],
						);

						return;
					}

					checkNetwork(e);

					throw e;
				}
			})(),
		);

		return savedUser?.user;
	}

	const now = Date.now();
	tries = tries.filter((time) => time < now - refreshInterval);
	tries.push(now);

	try {
		return await fetchUser();
	} catch (e) {
		if (savedUser?.user) {
			return savedUser.user;
		}

		throw e;
	} finally {
		if (
			forceRefresh &&
			getCacheAge(await loadCachedUser()) > milliSeconds.fromSeconds(2)
		) {
			triggerPromise(fetchPmUser());
		}
	}
};

const canRetry = () => {
	const now = Date.now();
	tries = tries.filter((time) => time < now - getUserTTL());

	return tries.length < 20;
};

const calculateUser = async (
	tryReAuthentication = false,
	fresh?: boolean,
): Promise<User | undefined> => {
	if (!(await readSession())?.uid) {
		return undefined;
	}

	await getAccessToken(); // Get an access token if we don't have one yet

	try {
		const user = await loadUser(fresh && canRetry());

		if (user || !tryReAuthentication) {
			return user;
		}
	} catch (e) {
		if (!tryReAuthentication || !isUnauthorizedError(e)) {
			throw e;
		}
	}

	await refreshToken(); // Refresh the token and re-try if it expired

	return await loadUser();
};

export const getUser = async (
	tryReAuthentication = false,
	fresh?: boolean,
): Promise<User | undefined> => {
	const user = await calculateUser(tryReAuthentication, fresh);

	dispatchUserDataEvent(user);

	return user;
};

export const getFreshUser = (): Promise<User | undefined> =>
	getUser(true, true);
