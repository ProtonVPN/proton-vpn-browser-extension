import type {Logical} from './Logical';
import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {getCountryAndCoordinates} from '../account/getLocation';
import {triggerPromise} from '../tools/triggerPromise';
import {calculateLogicalScoreAndUpStatus} from './calculateLogicalScoreAndUpStatus';
import type {LogicalServersCache} from './logicalServers';
import {logicalServers} from './logicalServers';

export const fetchLogicalsV2 = async (
	cache: LogicalServersCache | undefined,
	ids: string[],
): Promise<Logical[]> => {
	// Use last raw string obtained from Last-Modified header if available
	const ifModifiedSince = cache?.lastModified;
	const {logicals, lastModified, statusId} = await fetchWithUserInfo<
		{
			logicals: Logical[]; // From LogicalServers in the JSON response
			lastModified: string | null; // From Last-Modified response header
			statusId: string; // Reference of the status list the logicals point at
		},
		{LogicalServers: Logical[]; StatusId?: string}
	>(
		'vpn/v2/logicals' +
			(ids.length
				? `?${ids.map((id) => `IncludeID[]=${encodeURIComponent(id)}`).join('&')}`
				: ''),
		{
			headers: {
				'If-Modified-Since': ifModifiedSince || 'Thu, 01 Jan 1970 00:00:00 GMT',
				'x-pm-response-truncation-permitted': 'true',
			},
		},
		(response, data: {LogicalServers: Logical[]; StatusId?: string}) => {
			const responseLastModified = response.headers.get('Last-Modified');

			return {
				logicals: data?.LogicalServers,
				lastModified: responseLastModified,
				// Any stable value does the job: it's only read to tell a v2 cache
				// from a v1 one, which has no status list to point at.
				statusId: data?.StatusId || responseLastModified || `${Date.now()}`,
			};
		},
	);

	const {country, coordinates} = await getCountryAndCoordinates();
	logicals.forEach((logical) => {
		calculateLogicalScoreAndUpStatus(logical, country, coordinates);
	});

	triggerPromise(logicalServers.setValue(logicals, {lastModified, statusId}));

	return logicals;
};
