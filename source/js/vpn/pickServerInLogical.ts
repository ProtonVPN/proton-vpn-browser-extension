import type {Logical} from './Logical';
import {isServerUp} from './isServerUp';

export const pickServerInLogical = (logical: Logical | undefined) => {
	const allServers = logical?.Servers || [];
	const upServers = allServers.filter(isServerUp);
	const servers = upServers.length > 0 ? upServers : allServers;

	return servers[Math.floor(Math.random() * servers.length)];
};
