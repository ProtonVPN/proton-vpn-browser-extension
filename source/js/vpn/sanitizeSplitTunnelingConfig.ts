import type {SplitTunnelingConfig} from './ConnectionState';
import {SplitTunnelingMode} from './WebsiteFilter';

const modes: readonly unknown[] = Object.values(SplitTunnelingMode);

/**
 * Validate a split-tunneling config received by message.
 *
 * Returns undefined when the payload is not a config at all (so the caller
 * can keep the current one). Entries that are not non-empty strings are dropped.
 */
export const sanitizeSplitTunnelingConfig = (
	data: unknown,
): SplitTunnelingConfig | undefined => {
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		return undefined;
	}

	const {mode, filteredDomains} = data as Record<string, unknown>;

	if (typeof mode !== 'undefined' && !modes.includes(mode)) {
		return undefined;
	}

	if (
		typeof filteredDomains !== 'undefined' &&
		!Array.isArray(filteredDomains)
	) {
		return undefined;
	}

	const config: SplitTunnelingConfig = {};

	if (mode) {
		config.mode = mode as SplitTunnelingMode;
	}

	if (filteredDomains) {
		config.filteredDomains = filteredDomains.filter(
			(domain): domain is string =>
				typeof domain === 'string' && domain.trim() !== '',
		);
	}

	return config;
};
