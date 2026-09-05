import type {Logical} from './Logical';
import {isServerUp} from './isServerUp';

export const calculateLogicalUp = (logical: Logical): void => {
	logical._up =
		Number((logical as unknown as {Status?: number}).Status ?? 0) > 0 &&
		(logical.Servers || []).some(isServerUp);
};
