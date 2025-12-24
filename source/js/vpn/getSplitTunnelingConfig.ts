import {getDomainFilterList} from './getDomainFilterList';
import {StoredWebsiteFilterList, SplitTunnelingMode} from './WebsiteFilter';
import {defaultSplitTunnelingMode} from './SplitTunnelingDomainManager';

export interface SplitTunnelingConfig {
	mode: SplitTunnelingMode;
	filteredDomains: string[];
}

export const getSplitTunnelingConfig = (
	userTier: number,
	splitTunneling: StoredWebsiteFilterList,
): SplitTunnelingConfig => (splitTunneling.enabled !== false && userTier > 0)
	? ({
		mode: splitTunneling.mode || defaultSplitTunnelingMode,
		filteredDomains: getDomainFilterList(
			splitTunneling.value.filter(
				domain => (domain.mode || defaultSplitTunnelingMode) === (splitTunneling.mode || defaultSplitTunnelingMode),
			),
		),
	})
	: ({
		mode: defaultSplitTunnelingMode,
		filteredDomains: [],
	});
