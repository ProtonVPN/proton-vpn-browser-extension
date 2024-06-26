import {connectedServer} from './connectedServer';
import {getSortedLogicals} from './getLogicals';
import {connectLogical} from '../state';
import {getBestLogical} from './getBestLogical';
import {pickServerInLogical} from './pickServerInLogical';

let exclusion: (string | number)[] = [];

export const rotateServer = (userTier: number) => {
	connectedServer.get().then(async storedServer => {
		const server = storedServer?.value;

		if (!server) {
			return;
		}

		exclusion.push(server.proxyHost);

		const alternatives = (await getSortedLogicals()).filter(logical => (
			logical.Servers?.[0]?.Domain !== server.proxyHost &&
			logical.EntryCountry === server.exitCountry &&
			(!server.exitEnglishCity || server.exitEnglishCity === logical.City)
		));

		if (!alternatives.length) {
			return;
		}

		let rest = alternatives.filter(logical => logical.Servers?.[0]?.Domain && (exclusion.indexOf(logical.Servers[0].Domain) === -1));

		if (!rest.length) {
			exclusion = [];
			rest = alternatives;
		}

		const best = getBestLogical(rest, userTier);
		const bestServer = pickServerInLogical(best);

		if (!best || !bestServer) {
			return;
		}

		await connectLogical(best, bestServer);
	});
};
