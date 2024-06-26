import {Logical} from './Logical';
import {isServerUp} from './isServerUp';

export const pickServerInLogical = (logical: Logical | undefined) => {
	const servers = (logical?.Servers || []).filter(isServerUp);

	return servers[Math.floor(Math.random() * servers.length)];
};
