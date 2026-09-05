import type {Logical, LogicalLoad} from './Logical';
import type {Coordinates} from '../tools/Coordinates';
import {calculateLogicalScoreAndUpStatus} from './calculateLogicalScoreAndUpStatus';

export const mergeLoadsIntoLogicals = (
	logicals: Logical[],
	loads: LogicalLoad[],
	userLocation: Partial<Coordinates>,
	userCountry: string,
): void => {
	logicals.forEach((logical) => {
		const index = logical.StatusReference.Index ?? undefined;

		if (typeof index === 'number' && loads[index]) {
			calculateLogicalScoreAndUpStatus(
				Object.assign(logical, loads[index]),
				userCountry,
				userLocation,
			);
		}
	});
};
