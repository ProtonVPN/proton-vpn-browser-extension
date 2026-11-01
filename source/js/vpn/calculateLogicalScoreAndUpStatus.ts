import type {Coordinates} from '../tools/Coordinates';
import type {Logical} from './Logical';
import {calculateScore} from './calculateScore';

/**
 * Mutate `logical` to add the `Score` (sorting rank of how good it can be for the user)
 * and `_up` (either it's working fine, e.g. not in maintenance/outage)
 */
export const calculateLogicalScoreAndUpStatus = (
	logical: Logical,
	userCountry: string,
	userLocation?: Partial<Coordinates>,
): void => {
	if (userLocation && typeof logical.ServerCapacity !== 'undefined') {
		logical.Score = calculateScore(
			logical.Visible ?? false,
			logical.Enabled ?? false,
			logical.ServerCapacity,
			logical.StatusReference.Cost,
			logical.StatusReference.Penalty,
			logical.ExitCountry,
			logical.EntryLocation,
			logical.ExitLocation,
			userLocation,
			userCountry,
		);
	}

	logical._up = Boolean(logical.Enabled && logical.Visible);
};
