import {SplitTunnelingMode} from './WebsiteFilter';
import type {SplitTunnelingConfig} from './ConnectionState';

const vpnDomainsNeededForIncludeMode: readonly string[] = [
	'.protonvpn.net',
	'.protonvpn.com',
];

export const getIncludeOnlyList = (
	splitTunneling: SplitTunnelingConfig | undefined,
) =>
	splitTunneling?.mode === SplitTunnelingMode.Include
		? [
				...(splitTunneling.filteredDomains || []),
				...vpnDomainsNeededForIncludeMode,
			]
		: undefined;
