import {loadCachedUser} from './user/loadCachedUser';
import {fetchWithNetZone} from './getLocation';

export const fetchWithUserInfo = async <T, D = any>(
	url: string,
	init?: RequestInit,
	resultBuilder?: (response: Response, data: D) => T,
): Promise<T> => {
	const {
		MaxTier: maxTier,
		Groups: groups,
	} = (await loadCachedUser())?.user?.VPN || {};

	if (typeof maxTier !== 'number') {
		throw new Error(`Cannot fetch ${url} while not authenticated`);
	}

	init ||= {};
	init.headers ||= {};

	Object.assign(init.headers, {'x-pm-max-tier': `${maxTier}`});

	if (groups) {
		const groupCount = groups.length;
		Object.assign(
			init.headers,
			groupCount === 1
				? {'x-pm-single-group': groups.join(',')}
				: {'x-pm-group-count': groupCount}
		);
	}

	return await fetchWithNetZone<T, D>(url, init, resultBuilder);
};
