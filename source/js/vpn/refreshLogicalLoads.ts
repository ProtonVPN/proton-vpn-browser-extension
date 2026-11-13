import type {LogicalServersCache} from './logicalServers';
import {logicalServers} from './logicalServers';
import {getLoads} from './getLoads';
import {getCountryAndCoordinates} from '../account/getLocation';
import {mergeLoadsIntoLogicals} from './mergeLoadsIntoLogicals';

export const refreshLogicalLoads = async (cache: LogicalServersCache) => {
	if (!cache.statusId || !cache.value?.length) {
		// We'll wait for logical server list to be fetched first
		return;
	}

	const {loads, time} = await getLoads(cache.statusId);
	const {coordinates, country} = await getCountryAndCoordinates();
	// Propagate the new loads/statuses immediately to the current cache object
	mergeLoadsIntoLogicals(cache.value, loads, coordinates, country);

	await logicalServers.transaction((newCache) => {
		if (newCache && newCache.statusId === cache.statusId) {
			// Then propagate the new loads/statuses into the latest value in cache
			mergeLoadsIntoLogicals(newCache.value, loads, coordinates, country);
			newCache.lastLoadUpdate = time;
			// Keep passed cache in sync in case storage was updated in the meantime
			Object.assign(cache, newCache);
		}

		return newCache;
	});
};
