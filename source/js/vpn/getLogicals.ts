import type {Logical} from './Logical';
import type {Coordinates} from '../tools/Coordinates';
import {comp} from '../tools/comp';
import {getCacheAge} from '../tools/getCacheAge';
import {milliSeconds} from '../tools/milliSeconds';
import {getElapsedMillisecondsSinceLastActivity} from '../tools/activity';
import {triggerPromise} from '../tools/triggerPromise';
import type {BroadcastMessage} from '../tools/broadcastMessage';
import {
	getLogicalCheckUpRefreshInterval,
	getLogicalsBlockingUpdateTTL,
	getLogicalsTTL,
} from '../intervals';
import type {LogicalServersCache} from './logicalServers';
import {logicalServers} from './logicalServers';
import {isLogicalConnectable} from './isLogicalConnectable';
import {calculateLogicalScoreAndUpStatus} from './calculateLogicalScoreAndUpStatus';
import {getLoadsMaxAge} from './getLoadsMaxAge';
import {calculateLogicalUp} from './calculateLogicalUp';
import {refreshLogicalLoads} from './refreshLogicalLoads';
import {fetchLogicalsByIds} from './fetchLogicals';
import {handleError} from '../tools/sentry';
import {fetchLogicalsWithIncludedIds} from './fetchLogicalsWithIncludedIds';

const map: Record<string, Logical> = {};

export const recordLogicalInMap = (logical: Logical) => {
	map[logical.ID] = logical;
};

export const clearLogicalsCache = () => logicalServers.remove();

export const forgetLogicals = () => {
	triggerPromise(logicalServers.remove());
};

export interface BroadcastLogicals extends BroadcastMessage<'logicalUpdate'> {
	data: Logical[];
}

export const loadLogicalLoads = async (): Promise<Logical[]> => {
	const cache = await logicalServers.get();

	if (!cache) {
		return await fetchLogicalsWithIncludedIds();
	}

	const logicalAge = getCacheAge(cache);
	const cacheMissing = !cache?.statusId;

	// If the list is obsolete (too old to display) or has not statusId (meaning it's v1)
	if (cacheMissing || logicalAge > getLogicalsBlockingUpdateTTL()) {
		// Then user will wait for request to complete
		// and can only browse again the list when it succeeds
		return await fetchLogicalsWithIncludedIds(cache);
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
		triggerPromise(fetchLogicalsWithIncludedIds(cache));

		return cache.value;
	}

	return await fetchLogicalsWithIncludedIds(cache);
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

const getLogicalFromCacheWithLoad = async (
	cache: LogicalServersCache,
	id: string | number,
) => {
	const logical = cache.value?.find((l) => l.ID === id);

	if (!logical || 'ServerCapacity' in logical) {
		return logical;
	}

	await refreshLogicalLoads(cache);

	return cache.value?.find((l) => l.ID === id);
};

/**
 * Check from recent API data if a logical is still good to stay connected on it.
 */
export const shouldStayOnLogical = async (
	id: Logical['ID'],
	country: string,
	coordinates: Partial<Coordinates>,
): Promise<boolean> => {
	try {
		const cache = await logicalServers.get();

		if (cache) {
			const loadAge = Date.now() - (cache.lastLoadUpdate ?? 0);

			if (loadAge <= getLogicalCheckUpRefreshInterval()) {
				const logical = await getLogicalFromCacheWithLoad(cache, id);

				if (logical) {
					return isLogicalUp(logical, country, coordinates);
				}
			}
		}

		const logicals = await fetchLogicalsByIds([id], cache);

		return Boolean(
			logicals[0] && isLogicalUp(logicals[0], country, coordinates),
		);
	} catch (error) {
		// If the call to /logicals or /status fails, it's fine to stay connected where
		// we are at present, we still report error for investigation
		handleError(error);

		return true;
	}
};
