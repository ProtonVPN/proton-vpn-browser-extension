import type {Logical} from './Logical';
import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {calculateLogicalUp} from './calculateLogicalUp';
import type {LogicalServersCache} from './logicalServers';
import {logicalServers} from './logicalServers';

export const refreshLogicalLoadsV1 = async (
	cache: LogicalServersCache,
): Promise<void> => {
	const {LogicalServers: logicals} = await fetchWithUserInfo<{
		LogicalServers: Logical[];
	}>('vpn/v1/loads');
	const logicalsById: Record<string, Logical> = {};

	logicals.forEach((logical) => {
		logicalsById[logical.ID] = logical;
	});

	await logicalServers.transaction((newCache) => {
		if (newCache) {
			newCache.value.forEach((logical) => {
				if (logicalsById[logical.ID]) {
					calculateLogicalUp(Object.assign(logical, logicalsById[logical.ID]));
				}
			});
			cache.value = newCache.value;
			cache.lastLoadUpdate = Date.now();
		}

		return newCache;
	});
};
