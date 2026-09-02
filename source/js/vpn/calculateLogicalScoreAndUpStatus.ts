import type {Coordinates} from '../tools/Coordinates';
import type {Logical} from './Logical';
import {calculateScore} from './calculateScore';

/**
 * Set the score and the up status of a logical coming from logicals v2, where
 * both are computed locally from the load of the logical and the distance
 * between the user and the servers.
 */
export const calculateLogicalScoreAndUpStatus = (
	logical: Logical,
	userCountry: string,
	userLocation: Partial<Coordinates> = {},
): void => {
	const visible = Boolean(logical.Visible);
	const enabled = Boolean(logical.Enabled);
	const serverCapacity = logical.ServerCapacity ?? 0;

	logical.Score = calculateScore(
		visible,
		enabled,
		serverCapacity,
		logical.StatusReference.Cost,
		logical.StatusReference.Penalty,
		logical.ExitCountry,
		logical.EntryLocation,
		logical.ExitLocation,
		userLocation,
		userCountry,
	);
	logical._up = visible && enabled && serverCapacity > 0;
};
