import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import type {Logical} from './Logical';
import {getCountryAndCoordinates} from '../account/getLocation';
import {getLoads} from './getLoads';
import {mergeLoadsIntoLogicals} from './mergeLoadsIntoLogicals';
import {triggerPromise} from '../tools/triggerPromise';
import {logicalServers, type LogicalServersCache} from './logicalServers';

export const fetchLogicalsV2 = async (
	cache: LogicalServersCache | undefined,
	lookupIds: string[],
) => {
	// Use last raw string obtained from Last-Modified header if available
	const ifModifiedSince = cache?.statusId ? cache?.lastModified : undefined;
	const {logicals, lastModified, statusId} = await fetchWithUserInfo<
		{
			logicals: Logical[]; // From LogicalServers in the JSON response
			lastModified: string | null; // From Last-Modified response header
			statusId: string;
		},
		{
			LogicalServers: Logical[];
			StatusID: string;
		}
	>(
		'vpn/v2/logicals' +
			(lookupIds.length
				? `?${lookupIds.map((id) => `IncludeID[]=${encodeURIComponent(id)}`).join('&')}`
				: ''),
		{
			headers: {
				'If-Modified-Since': ifModifiedSince || 'Thu, 01 Jan 1970 00:00:00 GMT',
				'x-pm-response-truncation-permitted': 'true',
			},
		},
		(response, data: {LogicalServers: Logical[]; StatusID: string}) => ({
			logicals: data.LogicalServers,
			lastModified: response.headers.get('Last-Modified'),
			statusId: data.StatusID,
		}),
	);
	const {coordinates, country} = await getCountryAndCoordinates();
	const {loads, time} = await getLoads(statusId);
	mergeLoadsIntoLogicals(logicals, loads, coordinates, country);

	triggerPromise(
		logicalServers.setValue(logicals, {
			lastModified: Math.max(time, Number(lastModified ?? time)),
			statusId,
		}),
	);

	return logicals;
};
