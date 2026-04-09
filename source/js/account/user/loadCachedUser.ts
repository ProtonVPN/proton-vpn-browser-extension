import {storedUser} from './storedUser';
import type {User} from './User';
import {isUserResult} from './User';

export const loadCachedUser = async () => {
	const cache = await storedUser.load();

	if (isUserResult(cache?.user)) {
		cache.user = cache.user.User;
	}

	return cache as {
		time?: number;
		user?: User;
	};
};
