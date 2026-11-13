'use popup';
import type {PmUser} from './PmUser';
import {getPmUserFromBackground} from './getPmUserFromBackground';

export const getUserGetterWithInMemoryCache = () => {
	let pmUserCache: {user: PmUser | undefined} | null = null;

	const get = async () => {
		if (pmUserCache) {
			return pmUserCache.user;
		}

		const user = await getPmUserFromBackground();

		pmUserCache = {user};

		return user;
	};

	const set = (user: PmUser | undefined) => {
		pmUserCache = {user};
	};

	return {get, set};
};
