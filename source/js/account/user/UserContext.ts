/* c8 ignore start */

import type {Coordinates} from '../../tools/Coordinates';

/**
 * What the server list needs to know about the current user to decide what is
 * reachable and how servers should be scored: the plan tier they can connect
 * with, and where they connect from.
 */
export interface UserContext {
	/** Highest tier the user can connect to. */
	tier: number;
	/** ISO 3166-1 alpha-2 code of the user country, `XX` when unknown. */
	country: string;
	/** Approximate user location, used to score logicals v2. */
	location?: Partial<Coordinates>;
}

/* c8 ignore stop */
