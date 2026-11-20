'use popup';
import {isNotFoundError} from '../api/errorGuards';
import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {getCountryAndCoordinates} from '../account/getLocation';
import {warn} from '../log/log';
import {triggerPromise} from '../tools/triggerPromise';
import type {Coordinates} from '../tools/Coordinates';
import type {Logical} from './Logical';
import {logicalServers} from './logicalServers';
import {
	getSortedLogicals,
	isLogicalUp,
	recordLogicalInMap,
} from './getLogicals';
import {Feature} from './Feature';
import {getLatestCachedStatuses} from './getLatestCachedStatuses';
import {calculateLogicalScoreAndUpStatus} from './calculateLogicalScoreAndUpStatus';
import {
	recordLookupIdFound,
	recordLookupNameNotFound,
	wasLookupNameRecentlyNotFound,
} from './lookups';

/**
 * Should not happen because we called getSortedLogicals() before that builds the cache
 * But in rare case, storage permission can have been revoked, or it could be full
 * In such case we just skip.
 */
const warnMissingCache = () => {
	warn('Missing cache');
};

const pushLogicalToCache = (
	logical: Logical,
	country: string,
	coordinates: Partial<Coordinates>,
): void => {
	isLogicalUp(logical, country, coordinates); // Set _up status
	recordLogicalInMap(logical);

	// Update cache asynchronously
	triggerPromise(
		logicalServers.transaction((cache) => {
			if (!cache) {
				warnMissingCache();

				return cache;
			}

			cache.value.push(logical);

			return cache;
		}),
	);
	recordLookupIdFound(logical.ID);
};

const fetchLogicalLookup = async (name: string, init?: RequestInit) => {
	const upperName = name.toUpperCase();

	if (await wasLookupNameRecentlyNotFound(upperName)) {
		return undefined;
	}

	try {
		const {LogicalServer: logical, StatusID: statusId} =
			await fetchWithUserInfo<{
				LogicalServer: Logical & {Status?: number};
				StatusID: string;
			}>(`vpn/v1/logicals/lookup/${encodeURIComponent(name)}`, init);

		if (!logical) {
			return undefined;
		}

		const {country, coordinates} = await getCountryAndCoordinates();

		const enabled = Boolean(logical.Status);
		delete logical.Status;
		Object.assign(logical, {
			Visible: true,
			Enabled: enabled,
			AutoConnectable:
				enabled &&
				(logical.Features & (Feature.TOR | Feature.RESTRICTED)) === 0,
		});
		const index = logical.StatusReference.Index;

		if (typeof index === 'number') {
			const loads = await getLatestCachedStatuses(statusId);

			if (loads[index]) {
				calculateLogicalScoreAndUpStatus(
					Object.assign(logical, loads[index]),
					country,
					coordinates,
				);
			}
		}

		pushLogicalToCache(logical, country, coordinates);

		return logical;
	} catch (error) {
		if (!isNotFoundError(error)) {
			warn(error);

			throw error;
		}

		recordLookupNameNotFound(upperName);

		return undefined;
	}
};

export const lookupLogical = async (name: string, init?: RequestInit) => {
	const logicals = await getSortedLogicals();
	const upperName = name.toLocaleUpperCase();

	return (
		logicals.find(
			(logical) => logical.Name.toLocaleUpperCase() === upperName,
		) || fetchLogicalLookup(name, init)
	);
};
