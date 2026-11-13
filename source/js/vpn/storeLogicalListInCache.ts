import {triggerPromise} from '../tools/triggerPromise';
import {logicalServers} from './logicalServers';
import type {LogicalServersCacheMetadata} from './logicalServers';
import type {Logical} from './Logical';

type StatusId = Exclude<LogicalServersCacheMetadata['statusId'], null>;

/**
 * Store the given list in cache (non-blocking, so it happens after the caller
 * function returned), alongside metadata (lastModified: API last modification,
 * statusId: the list identifier the user must ask status/loads for,
 * lastLoadUpdate: when status/loads were last updated).
 */
export const storeLogicalListInCache = (
	logicals: Logical[],
	lastModified: LogicalServersCacheMetadata['lastModified'],
	statusId: StatusId,
	lastLoadUpdate?: LogicalServersCacheMetadata['lastLoadUpdate'],
) => {
	// lastModified, statusId and time are safe to use even when onlyIds is set
	// because the API always take into account all the logicals the user is allowed
	// to see when generating those values
	triggerPromise(
		logicalServers.setValue(logicals, {
			lastModified,
			statusId,
			...(typeof lastLoadUpdate === 'undefined' ? {} : {lastLoadUpdate}),
		}),
	);
};

/**
 * Merge loads (provided a merge callback that will apply them on a given list of logicals)
 * into the current cached value if statusId matches, then update lastLoadUpdate.
 */
export const updateLogicalCacheLoads = (
	statusId: StatusId,
	merge: (logicals: Logical[]) => void,
	lastLoadUpdate: LogicalServersCacheMetadata['lastLoadUpdate'],
) => {
	triggerPromise(
		logicalServers.transaction((current) => {
			if (current && current.statusId === statusId) {
				merge(current.value);
				current.lastLoadUpdate = lastLoadUpdate;
			}

			return current;
		}),
	);
};
