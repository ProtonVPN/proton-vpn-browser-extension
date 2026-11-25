import type {WithResponse} from '../api/ApiError';
import {isNotModified} from '../api/errorGuards';
import {triggerPromise} from '../tools/triggerPromise';
import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {RequestPriority, withPriority} from '../api/RequestPriority';
import {getCountryAndCoordinates} from '../account/getLocation';
import type {Logical} from './Logical';
import {getLoads} from './getLoads';
import {mergeLoadsIntoLogicals} from './mergeLoadsIntoLogicals';
import {type LogicalServersCache} from './logicalServers';
import {
	storeLogicalListInCache,
	updateLogicalCacheLoads,
} from './storeLogicalListInCache';
import {getCities} from './getCities';

type RawResponseData = {
	LogicalServers: Logical[];
	StatusID: string;
};

type FormattedResponse = {
	logicals: Logical[]; // From LogicalServers in the JSON response
	lastModified: string | null; // From Last-Modified response header
	statusId: string;
};

type NonEmptyList<T> = [T, ...T[]];

/**
 * Return query parameters as a list of string (prefixed with key and value encoded).
 */
const formatQueryParameters = (
	includedIds: (string | number)[],
	onlyIds?: (string | number)[],
) => [
	...(onlyIds ?? []).map((id) => `ID[]=${encodeURIComponent(id)}`),
	...(includedIds.length
		? includedIds.map((id) => `IncludeID[]=${encodeURIComponent(id)}`)
		: []),
];

/**
 * Pick relevant values from response headers and body.
 */
const formatResponse = (
	response: Response,
	data: RawResponseData,
): FormattedResponse => ({
	logicals: data.LogicalServers,
	lastModified: response.headers.get('Last-Modified'),
	statusId: data.StatusID,
});

/**
 * Return the options for the fetching of logical such as the specific
 * headers expected for this endpoint.
 */
const getRequestOptions = (
	ifModifiedSince: string | undefined,
	priority: RequestPriority,
) =>
	withPriority(priority, {
		headers: {
			'If-Modified-Since': ifModifiedSince || 'Thu, 01 Jan 1970 00:00:00 GMT',
			'x-pm-response-truncation-permitted': 'true',
		},
	});

const fetchLogicalsOrReadCache = async (
	cache: LogicalServersCache | undefined,
	includedIds: (string | number)[],
	priority: RequestPriority,
	onlyIds?: NonEmptyList<string | number>,
): Promise<{
	logicals: Logical[];
	lastModified: string | null;
	statusId: string;
	success: boolean;
}> => {
	try {
		// Use last raw string obtained from Last-Modified header if available
		const ifModifiedSince =
			(cache?.statusId && cache?.lastModified) || undefined;
		const parameters = formatQueryParameters(includedIds, onlyIds);
		const {logicals, lastModified, statusId} = await fetchWithUserInfo<
			FormattedResponse,
			RawResponseData
		>(
			'vpn/v2/logicals' + (parameters.length ? `?${parameters.join('&')}` : ''),
			getRequestOptions(ifModifiedSince, priority),
			formatResponse,
		);
		// Keep city translations up to date after logical list is refreshed,
		// Translation get refreshed only if the cache for the current language
		// is outdated
		triggerPromise(getCities(undefined, false, RequestPriority.BACKGROUND));

		return {
			logicals,
			lastModified,
			statusId,
			success: true,
		};
	} catch (e) {
		// Check if we have a value in cache and statusId (meaning a cache from a v2 call).
		// Else, we'll just do as if there is no cache and re-throw
		if (cache && cache.value && cache.statusId) {
			const response = (e as WithResponse)?.response as Response | undefined;
			const fallbackResult = {
				logicals: onlyIds
					? cache.value.filter((logical) => onlyIds.includes(logical.ID))
					: cache.value,
				statusId: cache.statusId,
			};

			if (isNotModified(response)) {
				const lastModified = response.headers.get('Last-Modified');

				// Re-save the cached value with Last-Modified header
				// (which normally is also the same as the one already in the cache).
				// But the time: Date.now() called by .setValue() will stamp this value as
				// fresh so the BEX won't call /vpn/v2/logicals at all for the next 6 hours.
				storeLogicalListInCache(
					cache.value,
					lastModified,
					cache.statusId,
					cache.lastLoadUpdate,
				);

				return {
					...fallbackResult,
					lastModified,
					success: true,
				};
			}

			return {
				...fallbackResult,
				lastModified: cache.lastModified,
				success: false,
			};
		}

		throw e;
	}
};

const fetchLogicalsWithoutWritingCache = async (
	cache: LogicalServersCache | undefined,
	includedIds: (string | number)[],
	priority: RequestPriority,
	onlyIds?: NonEmptyList<string | number>,
) => {
	// Use last raw string obtained from Last-Modified header if available
	const {logicals, lastModified, statusId, success} =
		await fetchLogicalsOrReadCache(cache, includedIds, priority, onlyIds);
	const {coordinates, country} = await getCountryAndCoordinates();
	const {loads, time} = await getLoads(statusId, priority);

	return {
		logicals,
		statusId,
		lastLoadUpdate: time,
		mergeLoadsIntoLogicals(logicals: Logical[]): void {
			mergeLoadsIntoLogicals(logicals, loads, coordinates, country);
		},
		storeLogicalListInCache(logicals: Logical[]): void {
			// Dump new value (and timestamps) in cache only in case of success (200 or 304)
			if (success) {
				storeLogicalListInCache(logicals, lastModified, statusId, time);
			}
		},
	};
};

/**
 * Fetch all logicals from API, then write the new value in cache.
 *
 * The `cache` parameter is used to know the current state (lastModified), but the
 * cache is always updated even if the parameter passed is undefined.
 */
export const fetchLogicals = async (
	cache: LogicalServersCache | undefined,
	includedIds: (string | number)[],
	priority = RequestPriority.NORMAL,
) => {
	const {logicals, mergeLoadsIntoLogicals, storeLogicalListInCache} =
		await fetchLogicalsWithoutWritingCache(cache, includedIds, priority);

	mergeLoadsIntoLogicals(logicals);
	storeLogicalListInCache(logicals);

	return logicals;
};

/**
 * Fetch only the select logicals (by ID) from API and update status and load for all
 * the logicals in cache before returning this selection.
 *
 * Do nothing if the passed list of IDs is empty, and just return an empty array.
 */
export const fetchLogicalsByIds = async (
	ids: (string | number)[],
	cache?: LogicalServersCache,
	priority = RequestPriority.NORMAL,
) => {
	if (ids.length === 0) {
		return [];
	}

	const {logicals, statusId, lastLoadUpdate, mergeLoadsIntoLogicals} =
		await fetchLogicalsWithoutWritingCache(
			cache,
			ids,
			priority,
			ids as NonEmptyList<string | number>,
		);

	mergeLoadsIntoLogicals(logicals);

	if (cache?.value?.length) {
		mergeLoadsIntoLogicals(cache.value);
		updateLogicalCacheLoads(statusId, mergeLoadsIntoLogicals, lastLoadUpdate);
	}

	return logicals;
};
