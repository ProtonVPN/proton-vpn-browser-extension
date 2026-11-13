'use background';
import {fetchJson, isUnauthorizedError} from '../../api';
import {getPmUserTTL, getUserBlockingUpdateTTL} from '../../intervals';
import {getCacheAge} from '../../tools/getCacheAge';
import {GroupResponder} from '../../tools/GroupResponder';
import {triggerPromise} from '../../tools/triggerPromise';
import type {PmUser} from './PmUser';
import {readSession} from '../readSession';
import {refreshToken} from '../refreshToken';
import {getAccessToken} from '../getAccessToken';
import {isLoggedIn, logIn} from '../../vpn/state/stateStore';
import {storedPmUser} from './storedPmUser';
import type {WrappedUser} from './UserWrapper';
import {unwrapUser} from './UserWrapper';

const userRequestsGroup = new GroupResponder<PmUser | undefined>();

export const fetchPmUser = (): Promise<PmUser | undefined> =>
	userRequestsGroup.handle(async () => {
		const user = unwrapUser(
			await fetchJson<WrappedUser<PmUser> | undefined>(
				'core/v4/users?Locale=1',
			),
		);

		if (user) {
			if (!isLoggedIn()) {
				logIn();
			}

			triggerPromise(
				storedPmUser.set({
					time: Date.now(),
					user,
				}),
			);
		}

		return user;
	});

export const loadPmCachedUser = async () => {
	const cache = await storedPmUser.load();

	cache.user = unwrapUser(cache.user);

	return cache as {
		time?: number;
		user?: PmUser;
	};
};

export const loadPmUser = async (): Promise<PmUser | undefined> => {
	const savedUser = await loadPmCachedUser();

	const age = getCacheAge(savedUser);

	if (age < getPmUserTTL()) {
		return savedUser?.user;
	}

	if (age < getUserBlockingUpdateTTL()) {
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

export const getPmUser = async (
	tryReAuthentication = false,
): Promise<PmUser | undefined> => {
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
