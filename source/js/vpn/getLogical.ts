import type {Logical} from './Logical';
import type {CountryItem} from '../components/countryList';
import type {UserContext} from '../account/user/UserContext';
import {isLogicalUp} from './getLogicals';
import {c} from '../tools/translate';

const getAutoConnectableFilter =
	(userContext: UserContext) => (logical: Logical) =>
		(logical.AutoConnectable ?? true) &&
		isLogicalUp(logical, userContext.country, userContext.location) &&
		userContext.tier >= logical.Tier;

export const getAllLogicals = (group: CountryItem | undefined): Logical[] =>
	Object.values(group?.groups || {}).reduce(
		(logicals, subGroup) => logicals.concat(...getAllLogicals(subGroup)),
		group?.logicals || [],
	);

export const getBestLogical = (
	logicals: Logical[] | null | undefined,
	userContext: UserContext,
): Logical | undefined => {
	const servers = (logicals || []).filter(
		getAutoConnectableFilter(userContext),
	);
	let score = Infinity;
	let bestServer: Logical | undefined = undefined;

	servers.forEach((server) => {
		if (typeof server.Score !== 'undefined' && server.Score < score) {
			score = server.Score;
			bestServer = server;
		}
	});

	return bestServer;
};

export const getRandomLogical = (
	logicals: Logical[] | null | undefined,
	userContext: UserContext,
): Logical | undefined => {
	const servers = (logicals || []).filter(
		getAutoConnectableFilter(userContext),
	);
	const index = Math.floor(Math.random() * servers.length);

	return servers[index];
};

export const requireBestLogical = (
	logicals: Logical[] | null | undefined,
	userContext: UserContext,
	errorPreHandler?: (error: Error) => void,
): Logical => {
	const bestServer = getBestLogical(logicals, userContext);

	if (!bestServer) {
		errorPreHandler?.(
			new Error(
				c('Error')
					.t`Unable to find appropriate server, try to logout and login again if it persists.`,
			),
		);

		throw new Error('Misconfigured server. Cannot find the best one.');
	}

	return bestServer;
};

export const requireRandomLogical = (
	logicals: Logical[] | null | undefined,
	userContext: UserContext,
	errorPreHandler?: (error: Error) => void,
): Logical => {
	const randomServer = getRandomLogical(logicals, userContext);

	if (!randomServer) {
		errorPreHandler?.(
			new Error(
				c('Error')
					.t`Unable to find appropriate server, try to logout and login again if it persists.`,
			),
		);

		throw new Error('Misconfigured server. Cannot find a suitable one.');
	}

	return randomServer;
};
