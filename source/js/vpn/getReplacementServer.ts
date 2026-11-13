'use background';
import {getCountryAndCoordinates} from '../account/getLocation';
import {getCredentials} from '../account/credentials/getConnectionCredentials';
import type {Credentials} from '../account/credentials/Credentials';
import {guessTierFromCredentials} from '../account/credentials/guessTierFromCredentials';
import {shouldStayOnLogical} from './getLogicals';
import {getAlternativeServer} from './getAlternatives';
import {getCurrentLogicalGuesser} from './getCurrentLogicalGuesser';
import type {ConnectionState} from './ConnectionState';
import type {Logical} from './Logical';
import type {Server} from './Server';

/**
 * When the user should no longer stay on the given logical (e.g. it went
 * down or is in maintenance), find an alternative logical and server.
 *
 * Resolves undefined when staying is fine, or when no valid credentials are
 * available yet (no need to switch before, and without credentials soon
 * it will disconnect anyway).
 */
export const getReplacementServer = async (
	id: string | number,
	getCurrentState: () => ConnectionState,
	credentials?: Credentials,
): Promise<{logical?: Logical; server?: Server} | undefined> => {
	const {country, coordinates} = await getCountryAndCoordinates();

	if (await shouldStayOnLogical(id, country, coordinates)) {
		return undefined;
	}

	const currentCredentials = credentials || (await getCredentials(true));

	if (!currentCredentials) {
		return undefined;
	}

	const userContext = {
		country,
		location: coordinates,
		tier: guessTierFromCredentials(currentCredentials),
	};

	return await getAlternativeServer(
		id,
		userContext,
		getCurrentLogicalGuesser(userContext),
		getCurrentState,
	);
};
