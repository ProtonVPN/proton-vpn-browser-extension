import type {Logical} from './Logical';
import {isServerUp} from './isServerUp';
import {unsafeRandomPick} from '../tools/random';

export const pickServerInLogical = (logical: Logical | undefined) => {
	const allServers = logical?.Servers || [];
	const upServers = allServers.filter(isServerUp);

	return unsafeRandomPick(upServers.length > 0 ? upServers : allServers);
};
