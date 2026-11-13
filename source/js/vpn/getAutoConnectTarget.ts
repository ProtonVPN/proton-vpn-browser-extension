'use background';
import {getUser} from '../account/user/getUser';
import {getUserMaxTier} from '../account/user/getUserMaxTier';
import {getCountryAndCoordinates} from '../account/getLocation';
import {readSession} from '../account/readSession';
import {unsafeRandomMandatoryPick} from '../tools/random';
import {getLastChoice, getLogicalsFilteredByChoice} from './lastChoice';
import {getLogicalById, getSortedLogicals} from './getLogicals';
import {AutoConnect} from './features/AutoConnect';
import {SplitTunneling} from './features/SplitTunneling';
import {SecureCore} from './features/SecureCore';
import {getSecureCorePredicate} from './getSecureCorePredicate';
import {requireBestLogical} from './getLogical';
import {pickServerInLogical} from './pickServerInLogical';
import {getSplitTunnelingConfig} from './getSplitTunnelingConfig';
import type {Logical} from './Logical';
import type {Server} from './Server';
import type {SplitTunnelingConfig} from './ConnectionState';

export interface AutoConnectTarget {
	logical: Logical;
	server: Server;
	splitTunneling: SplitTunnelingConfig;
}

/**
 * When auto-connect is enabled and the user was connected last time,
 * pick the logical and server to connect to, based on their last choice.
 */
export const getAutoConnectTarget = async (): Promise<
	AutoConnectTarget | undefined
> => {
	const user = await getUser();

	if (!user) {
		return undefined;
	}

	const [
		initialChoice,
		logicals,
		autoConnect,
		splitTunneling,
		secureCore,
		{country, coordinates},
	] = await Promise.all([
		getLastChoice(),
		getSortedLogicals(),
		AutoConnect.create().then((feature) => feature.getConfig()),
		SplitTunneling.create().then((feature) => feature.getConfig()),
		SecureCore.create().then((feature) => feature.getConfig()),
		getCountryAndCoordinates(),
	]);

	if (!initialChoice?.connected || !autoConnect?.value) {
		return undefined;
	}

	// Quit auto-connect if there is no session
	if (!(await readSession())?.uid) {
		return undefined;
	}

	const userTier = getUserMaxTier(user);
	const userContext = {country, location: coordinates, tier: userTier};
	const filteredList = getLogicalsFilteredByChoice(
		logicals
			.filter(getSecureCorePredicate(userTier, secureCore))
			.filter((logical) => userTier >= logical.Tier),
		initialChoice,
		(id) => {
			const logical = getLogicalById(id);

			return logical ? [logical] : [];
		},
	);

	if (!filteredList[0]) {
		return undefined;
	}

	const logical =
		(initialChoice.pick === 'random'
			? unsafeRandomMandatoryPick(filteredList)
			: requireBestLogical(filteredList, userContext)) || filteredList[0];
	const server = pickServerInLogical(logical);

	if (!server?.Domain) {
		return undefined;
	}

	return {
		logical,
		server,
		splitTunneling: getSplitTunnelingConfig(userTier, splitTunneling),
	};
};
