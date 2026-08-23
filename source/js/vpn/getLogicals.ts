import type {Logical} from './Logical';
import {isNotModified} from '../api';
import type {Coordinates} from '../tools/Coordinates';
import {comp} from '../tools/comp';
import {getCacheAge} from '../tools/getCacheAge';
import {milliSeconds} from '../tools/milliSeconds';
import {getElapsedMillisecondsSinceLastActivity} from '../tools/activity';
import {triggerPromise} from '../tools/triggerPromise';
import {type CacheWrappedValue, Storage, storage} from '../tools/storage';
import type {BroadcastMessage} from '../tools/broadcastMessage';
import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {
	getLogicalCheckUpRefreshInterval,
	getLogicalsBlockingUpdateTTL,
	getLogicalsTTL,
} from '../intervals';
import {getCities} from './getCities';
import type {LogicalServersCache} from './logicalServers';
import {logicalServers} from './logicalServers';
import {isLogicalConnectable} from './isLogicalConnectable';
import {calculateLogicalScoreAndUpStatus} from './calculateLogicalScoreAndUpStatus';
import {getLoadsMaxAge} from './getLoadsMaxAge';
import {calculateLogicalUp} from './calculateLogicalUp';
import {refreshLogicalLoadsV1} from './refreshLogicalLoadsV1';
import {refreshLogicalLoadsV2} from './refreshLogicalLoadsV2';
import {useLogicalsV2} from './useLogicalsV2';
import {fetchLogicalsV2} from './fetchLogicalsV2';
import {fetchLogicalsV1} from './fetchLogicalsV1';

export const lookups = storage.item<CacheWrappedValue<Record<string, number>>>(
	'lookups',
	Storage.LOCAL,
);

const refreshLogicalLoads = async (cache: LogicalServersCache) => {
	return (await useLogicalsV2())
		? refreshLogicalLoadsV2(cache)
		: refreshLogicalLoadsV1(cache);
};

const getLookupIds = async () => {
	const value = (await lookups.get())?.value || {};
	const ids = Object.keys(value);
	// Forget about ID the extension didn't connect to for 100 days or more
	const threshold = milliSeconds.fromDays(-100, Date.now());
	let idsToForget = 0;
	const usedIds = ids.filter((id) => {
		// If this ID was not touched for more than 100 days
		if (value[id]! < threshold) {
			// List them for removal
			delete value[id];
			idsToForget++;

			return false;
		}

		return true;
	});

	if (idsToForget) {
		triggerPromise(lookups.setValue(value));
	}

	return usedIds;
};

const fetchLogicals = async (
	cache?: LogicalServersCache,
): Promise<Logical[]> => {
	const useV2 = await useLogicalsV2();

	try {
		const ids = await getLookupIds();

		const logicals = await (useV2
			? fetchLogicalsV2(cache, ids)
			: fetchLogicalsV1(cache, ids));
		triggerPromise(getCities());

		return logicals;
	} catch (e) {
		if (cache?.value) {
			const response = (e as any)?.response as Response | undefined;

			if (isNotModified(response)) {
				// Re-save the cached value with Last-Modified header
				// (which normally is also the same as the one already in the cache).
				// But the time: Date.now() called by .setValue() will stamp this value as
				// fresh so the BEX won't call /vpn/v2/logicals at all for the next 6 hours.
				triggerPromise(
					logicalServers.setValue(cache.value, {
						lastModified: response.headers.get('Last-Modified'),
						...(useV2 ? {statusId: cache.statusId} : {}),
					}),
				);
			}

			return cache.value;
		}

		throw e;
	}
};

export const lookupsNotFound = storage.item<
	CacheWrappedValue<Record<string, number>>
>('lookups-not-found', Storage.LOCAL);

const map: Record<string, Logical> = {};

export const recordLogicalInMap = (logical: Logical) => {
	map[logical.ID] = logical;
};

export const forgetLogicals = () => {
	triggerPromise(logicalServers.remove());
};

export interface BroadcastLogicals extends BroadcastMessage<'logicalUpdate'> {
	data: Logical[];
}

export const loadLoads = async (): Promise<Logical[]> => {
	const cache = await logicalServers.get();

	if (!cache) {
		return await fetchLogicals();
	}

	const logicalAge = getCacheAge(cache);
	const cacheMissing = cache?.statusId ? false : await useLogicalsV2();

	// If the list is obsolete (too old to display) or has not statusId (meaning it's v1)
	if (cacheMissing || logicalAge > getLogicalsBlockingUpdateTTL()) {
		// Then user will wait for request to complete
		// and can only browse again the list when it succeeds
		return await fetchLogicals(cache);
	}

	const loadAge = cache.lastLoadUpdate ?? logicalAge;

	getLoadsMaxAge().then(async (maxAge) => {
		if (loadAge > maxAge) {
			await refreshLogicalLoads(cache);
		}
	});

	return cache.value;
};

const getLogicals = async (): Promise<Logical[]> => {
	const cache = await logicalServers.get();
	const age = getCacheAge(cache);
	const idleDuration = await getElapsedMillisecondsSinceLastActivity();
	const freshnessThreshold =
		getLogicalsTTL() * (idleDuration > milliSeconds.fromHours(24) ? 2 : 1);

	// If logical list is fresh, just use the cache
	if (cache && age < freshnessThreshold) {
		return cache.value;
	}

	// If the list is not super fresh but still OK to display,
	// then we return it but asynchronously trigger a request
	// to update it
	if (cache && age < getLogicalsBlockingUpdateTTL()) {
		triggerPromise(fetchLogicals(cache));

		return cache.value;
	}

	return await fetchLogicals(cache);
};

const sortLogicals = (logicals: Logical[]): void => {
	logicals.sort((a, b) => {
		const aScore = a.SearchScore ?? 0;
		const bScore = b.SearchScore ?? 0;

		if (aScore !== bScore) {
			return comp(bScore, aScore);
		}

		if (a.ExitCountry !== b.ExitCountry) {
			return comp(a.ExitCountry, b.ExitCountry);
		}

		const [aPrefix, aSuffix] = a.Name.split('#', 2);
		const [bPrefix, bSuffix] = b.Name.split('#', 2);

		if (aPrefix === bPrefix) {
			if (/^\d+$/.test(aSuffix || '0') && /^\d+$/.test(bSuffix || '0')) {
				return comp(parseInt(aSuffix || '0', 10), parseInt(bSuffix || '0', 10));
			}

			return comp(aSuffix, bSuffix);
		}

		return comp(aPrefix, bPrefix);
	});
};

export const getSortedLogicals = async (): Promise<Logical[]> => {
	const logicals = (await getLogicals()).filter(isLogicalConnectable);
	sortLogicals(logicals);

	logicals.forEach(recordLogicalInMap);

	return logicals;
};

export const getLogicalById = (id: Logical['ID']): Logical | undefined =>
	map[id];

const isLogicalV2WithServerCapacity = (logical: Logical) =>
	'StatusReference' in logical && 'ServerCapacity' in logical;

export const isLogicalUp = (
	logical: Logical,
	userCountry: string,
	userLocation?: Partial<Coordinates>,
): boolean => {
	if (typeof logical._up === 'undefined') {
		const updateUp = isLogicalV2WithServerCapacity(logical)
			? (logical: Logical) =>
					calculateLogicalScoreAndUpStatus(logical, userCountry, userLocation) // for logicals v2
			: calculateLogicalUp; // for logicals v1

		updateUp(logical);
	}

	return logical._up as boolean;
};

/**
 * Check from recent API data if a logical is still good to stay connected on it.
 */
export const shouldStayOnLogical = async (
	id: Logical['ID'],
	country: string,
	coordinates: Partial<Coordinates>,
): Promise<boolean> => {
	const useV2 = await useLogicalsV2();

	if (useV2) {
		const cache = await logicalServers.get();
		const loadAge = Date.now() - (cache?.lastLoadUpdate ?? 0);

		if (loadAge <= getLogicalCheckUpRefreshInterval()) {
			const logical = cache?.value?.find((l) => l.ID === id);

			if (logical) {
				return isLogicalUp(logical, country, coordinates);
			}
		}
	}

	const version = useV2 ? 2 : 1;
	const encodedId = encodeURIComponent(id);
	const {LogicalServers: logicals} = await fetchWithUserInfo<{
		LogicalServers: Logical[];
	}>(`vpn/v${version}/logicals?ID[]=${encodedId}&IncludeID[]=${encodedId}`);

	return Boolean(logicals[0] && isLogicalUp(logicals[0], country, coordinates));
};
