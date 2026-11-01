import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import type {Logical} from './Logical';
import {triggerPromise} from '../tools/triggerPromise';
import {logicalServers, type LogicalServersCache} from './logicalServers';
import {calculateLogicalUp} from './calculateLogicalUp';

export const fetchLogicalsV1 = async (
	cache: LogicalServersCache | undefined,
	lookupIds: string[],
) => {
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
			(lookupIds.length
				? `?${lookupIds.map((id) => `IncludeID[]=${encodeURIComponent(id)}`).join('&')}`
				: ''),
		{
			headers: {
				'If-Modified-Since': ifModifiedSince || 'Thu, 01 Jan 1970 00:00:00 GMT',
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

	return logicals;
};
