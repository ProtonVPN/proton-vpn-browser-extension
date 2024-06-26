import {isPmUserResult, PmUser, PmUserResult} from './PmUser';
import {fetchJson, isUnauthorizedError} from '../../api';
import {readSession} from '../readSession';
import {refreshToken} from '../refreshToken';
import {getAccessToken} from '../getAccessToken';
import {getCacheAge} from '../../tools/getCacheAge';
import {isLoggedIn, logIn} from '../../state';
import {milliSeconds} from '../../tools/milliSeconds';
import {triggerPromise} from '../../tools/triggerPromise';
import {storedPmUser} from './storedPmUser';
import {getPmUserTTL} from '../../intervals';

export const fetchPmUser = async (): Promise<PmUser | undefined> => {
	const user = await fetchJson<PmUser | PmUserResult | undefined>('users');

	if (user) {
		if (!isLoggedIn()) {
			logIn();
		}

		triggerPromise(storedPmUser.set({
			time: Date.now(),
			user,
		}));
	}

	return isPmUserResult(user) ? user.User : user;
};

export const loadPmCachedUser = async () => {
	const cache = await storedPmUser.load();

	if (isPmUserResult(cache?.user)) {
		cache.user = cache.user.User;
	}

	return cache as {
		time?: number;
		user?: PmUser;
	};
};

export const loadPmUser = async (): Promise<PmUser|undefined> => {
	const savedUser = await loadPmCachedUser();

	const age = getCacheAge(savedUser);

	if (age < getPmUserTTL()) {
		return savedUser?.user;
	}

	if (age < milliSeconds.fromDays(3)) {
		triggerPromise(fetchPmUser());

		return savedUser?.user;
	}

	try {
		return await fetchPmUser();
	} catch (e) {
		if (savedUser?.user) {
			return savedUser.user;
		}

		throw e;
	}
};

export const getPmUser = async (tryReAuthentication = false): Promise<PmUser|undefined> => {
	if (!(await readSession())?.uid) {
		return undefined;
	}

	await getAccessToken(); // Get an access token if we don't have one yet

	try {
		const user = await loadPmUser();

		if (user || !tryReAuthentication) {
			return user;
		}
	} catch (e) {
		if (!tryReAuthentication || !isUnauthorizedError(e)) {
			throw e;
		}
	}

	await refreshToken(); // Refresh the token and re-try if it expired

	return await loadPmUser();
};
