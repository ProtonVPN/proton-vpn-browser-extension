import {SplitTunnelingMode} from './WebsiteFilter';
import type {SplitTunnelingConfig} from './ConnectionState';

export const getIncludeOnlyList = (splitTunneling: SplitTunnelingConfig | undefined) => (
	splitTunneling?.mode === SplitTunnelingMode.Include
		? splitTunneling.filteredDomains
		: undefined
);
