'use background';
import {
	proxyHost,
	proxyPort,
	proxySecureCorePort,
	singleProxyPort,
} from '../config';
import {Feature} from './Feature';
import type {Logical} from './Logical';
import type {Server} from './Server';
import type {ProxyServer, SplitTunnelingConfig} from './ConnectionState';

/**
 * Build the proxy server to connect to from a logical and one of its servers.
 */
export const toProxyServer = (
	logical: Logical,
	server: Server,
	splitTunneling?: SplitTunnelingConfig,
): ProxyServer => {
	const secureCoreLogical = (logical.Features & Feature.SECURE_CORE) !== 0;
	const label = server.Label || '';

	return {
		id: logical.ID,
		name: logical.Name,
		exitIp: server.ExitIP,
		entryCountry: logical.EntryCountry,
		exitCountry: logical.ExitCountry,
		exitCity: logical.Translations?.City || logical.City,
		exitEnglishCity: logical.City,
		exitLocation: logical.ExitLocation,
		secureCore: secureCoreLogical,
		proxyHost: proxyHost || server.Domain,
		proxyPort: secureCoreLogical
			? proxySecureCorePort || proxyPort
			: proxyPort +
				(!singleProxyPort && /^\d+$/.test(label) ? parseInt(label, 10) : 0),
		splitTunneling,
	};
};
