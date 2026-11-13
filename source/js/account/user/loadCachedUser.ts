import {storedUser} from './storedUser';
import type {User} from './User';
import {unwrapUser} from './UserWrapper';

export const loadCachedUser = async () => {
	const cache = await storedUser.load();

	cache.user = unwrapUser(cache.user);

	return cache as {
		time?: number;
		user?: User;
	};
};
