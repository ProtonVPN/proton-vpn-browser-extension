import {getDomainFilterList} from './getDomainFilterList';
import type {
	StoredWebsiteFilterList,
	SplitTunnelingMode,
} from './WebsiteFilter';
import {defaultSplitTunnelingMode} from './SplitTunnelingDomainManager';

export interface SplitTunnelingConfig {
	mode: SplitTunnelingMode;
	filteredDomains: string[];
	proxyPreRequests: boolean;
}

export const getSplitTunnelingConfig = (
	userTier: number,
	splitTunneling: StoredWebsiteFilterList,
): SplitTunnelingConfig =>
	splitTunneling.enabled !== false && userTier > 0
		? {
				mode: splitTunneling.mode || defaultSplitTunnelingMode,
				filteredDomains: getDomainFilterList(
					splitTunneling.value.filter(
						(domain) =>
							(domain.mode || defaultSplitTunnelingMode) ===
							(splitTunneling.mode || defaultSplitTunnelingMode),
					),
				),
				proxyPreRequests: splitTunneling.proxyPreRequests ?? false,
			}
		: {
				mode: defaultSplitTunnelingMode,
				filteredDomains: [],
				proxyPreRequests: false,
			};
