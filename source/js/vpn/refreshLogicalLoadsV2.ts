import type {Logical} from './Logical';
import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {getCountryAndCoordinates} from '../account/getLocation';
import {calculateLogicalScoreAndUpStatus} from './calculateLogicalScoreAndUpStatus';
import type {LogicalServersCache} from './logicalServers';
import {logicalServers} from './logicalServers';

export const refreshLogicalLoadsV2 = async (
	cache: LogicalServersCache,
): Promise<void> => {
	const {LogicalServers: logicals} = await fetchWithUserInfo<{
		LogicalServers: Logical[];
	}>('vpn/v2/loads');
	const logicalsById: Record<string, Logical> = {};

	logicals.forEach((logical) => {
		logicalsById[logical.ID] = logical;
	});

	const {country, coordinates} = await getCountryAndCoordinates();

	await logicalServers.transaction((newCache) => {
		if (newCache) {
			newCache.value.forEach((logical) => {
				if (logicalsById[logical.ID]) {
					calculateLogicalScoreAndUpStatus(
						Object.assign(logical, logicalsById[logical.ID]),
						country,
						coordinates,
					);
				}
			});
			cache.value = newCache.value;
			cache.lastLoadUpdate = Date.now();
		}

		return newCache;
	});
};
