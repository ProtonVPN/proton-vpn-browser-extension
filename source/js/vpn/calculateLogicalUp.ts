import type {Logical} from './Logical';
import {isServerUp} from './isServerUp';

/**
 * Set the up status of a logical coming from logicals v1, where it's given by
 * the logical own status and the status of the servers behind it.
 */
export const calculateLogicalUp = (logical: Logical): void => {
	const {Status} = logical as Logical & {Status?: number};

	logical._up = (Status ?? 0) > 0 && (logical.Servers || []).some(isServerUp);
};
