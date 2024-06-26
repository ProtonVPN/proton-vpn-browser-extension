import {storedUser} from './storedUser';
import {isUserResult, User} from './User';

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
