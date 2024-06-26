import {Logical} from './Logical';
import {CountryItem} from '../components/countryList';
import {isLogicalUp} from './getLogicals';
import {c} from '../tools/translate';

export const getAllLogicals = (group: CountryItem | undefined): Logical[] => Object.values(group?.groups || {})
	.reduce((logicals, subGroup) => logicals.concat(...getAllLogicals(subGroup)), (group?.logicals || []));

export const getBestLogical = (logicals: Logical[] | null | undefined, userTier: number): Logical | undefined => {
	const servers = (logicals || []).filter(logical => isLogicalUp(logical) && userTier >= logical.Tier);
	let score = Infinity;
	let bestServer: Logical|undefined = undefined;

	servers.forEach(server => {
		if (server.Score < score) {
			score = server.Score;
			bestServer = server;
		}
	});

	return bestServer;
};

export const requireBestLogical = (
	logicals: Logical[] | null | undefined,
	userTier: number,
	errorPreHandler?: (error: Error) => void,
): Logical => {
	const bestServer = getBestLogical(logicals, userTier);

	if (!bestServer) {
		errorPreHandler?.(new Error(
			c('Error').t`Unable to find appropriate server, try to logout and login again if it persists`
		));

		throw new Error('Missconfigured server. Cannot find the best one.');
	}

	return bestServer;
};
