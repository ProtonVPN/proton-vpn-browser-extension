import type {LogicalServersCache} from './logicalServers';
import {logicalServers} from './logicalServers';
import {getLoads} from './getLoads';
import {getCountryAndCoordinates} from '../account/getLocation';
import {mergeLoadsIntoLogicals} from './mergeLoadsIntoLogicals';

export const refreshLogicalLoadsV2 = async (cache: LogicalServersCache) => {
	if (!cache.statusId || !cache.value?.length) {
		// We'll wait for logical server list to be fetched first
		return;
	}

	const {loads, time} = await getLoads(cache.statusId);
	const {coordinates, country} = await getCountryAndCoordinates();

	await logicalServers.transaction((newCache) => {
		if (newCache) {
			mergeLoadsIntoLogicals(newCache.value, loads, coordinates, country);
			cache.value = newCache.value;
			cache.lastLoadUpdate = time;
		}

		return newCache;
	});
};
