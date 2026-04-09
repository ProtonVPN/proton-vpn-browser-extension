import type {Logical} from './Logical';
import {isNotModified} from '../api';
import {comp} from '../tools/comp';
import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {getCacheAge} from '../tools/getCacheAge';
import {milliSeconds} from '../tools/milliSeconds';
import {getElapsedMillisecondsSinceLastActivity} from '../tools/activity';
import {getCities} from './getCities';
import {triggerPromise} from '../tools/triggerPromise';
import {type CacheWrappedValue, Storage, storage} from '../tools/storage';
import type {BroadcastMessage} from '../tools/broadcastMessage';
import {isServerUp} from './isServerUp';
import {isLogicalConnectable} from './isLogicalConnectable';
import {
	getLogicalLoadsRefreshInterval,
	getLogicalsBlockingUpdateTTL,
	getLogicalsTTL,
} from '../intervals';

export const logicalServers = storage.item<LogicalServersCache>(
	'logicals-servers',
	Storage.LOCAL,
);

export const lookups = storage.item<CacheWrappedValue<Record<string, number>>>(
	'lookups',
	Storage.LOCAL,
);

type LogicalServersCache = CacheWrappedValue<Logical[]> & {
	lastModified: string;
	lastLoadUpdate?: number;
};

const calculateLogicalUp = (logical: Logical): void => {
	logical._up = logical.Status > 0 && (logical.Servers || []).some(isServerUp);
};

const getLoadsMaxAge = async () => {
	const baseInterval = getLogicalLoadsRefreshInterval();
	const idleDuration = await getElapsedMillisecondsSinceLastActivity();

	// Still connected or active during the last 3 hours
	if (idleDuration < milliSeconds.fromHours(3)) {
		return baseInterval / 2;
	}

	// Between 3 hours and 1 day
	if (idleDuration < milliSeconds.fromHours(24)) {
		return baseInterval * 2;
	}

	// More than 1 day
	return baseInterval * 4;
};

const refreshLogicalLoads = async (cache: LogicalServersCache) => {
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

const fetchLogicals = async (cache?: LogicalServersCache) => {
	try {
		const ids = await getLookupIds();

		// Use last raw string obtained from Last-Modified header if available
		const ifModifiedSince = cache?.lastModified;
		const {logicals, lastModified} = await fetchWithUserInfo<
			{
				logicals: Logical[]; // From LogicalServers in the JSON response
				lastModified: string | null; // From Last-Modified response header
			},
			{LogicalServers: Logical[]}
		>(
			'vpn/v1/logicals' +
				(ids.length
					? `?${ids.map((id) => `IncludeID[]=${encodeURIComponent(id)}`).join('&')}`
					: ''),
			{
				headers: {
					'If-Modified-Since':
						ifModifiedSince || 'Thu, 01 Jan 1970 00:00:00 GMT',
					'x-pm-response-truncation-permitted': 'true',
				},
			},
			(response, data: {LogicalServers: Logical[]}) => ({
				logicals: data?.LogicalServers,
				lastModified: response.headers.get('Last-Modified'),
			}),
		);
		logicals.forEach(calculateLogicalUp);

		triggerPromise(logicalServers.setValue(logicals, {lastModified}));
		triggerPromise(getCities());

		return logicals;
	} catch (e) {
		if (cache?.value) {
			const response = (e as any)?.response as Response | undefined;

			if (isNotModified(response)) {
				// Re-save the cached value with Last-Modified header
				// (which normally is also the same as the one already in the cache).
				// But the time: Date.now() called by .setValue() will stamp this value as
				// fresh so the BEX won't call /vpn/v1/logicals at all for the next 6 hours.
				triggerPromise(
					logicalServers.setValue(cache.value, {
						lastModified: response.headers.get('Last-Modified'),
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
	const logicalAge = getCacheAge(cache);

	// If the list is obsolete (too old to display)
	if (!cache || logicalAge > getLogicalsBlockingUpdateTTL()) {
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

const getLogicals = async () => {
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

const sortLogicals = (logicals: Logical[]) => {
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

export const getSortedLogicals = async () => {
	const logicals = (await getLogicals()).filter(isLogicalConnectable);
	sortLogicals(logicals);

	logicals.forEach(recordLogicalInMap);

	return logicals;
};

export const getLogicalById = (id: Logical['ID']): Logical | undefined =>
	map[id];

export const isLogicalUp = (logical: Logical): boolean => {
	if (typeof logical._up === 'undefined') {
		calculateLogicalUp(logical);
	}

	return logical._up as boolean;
};
