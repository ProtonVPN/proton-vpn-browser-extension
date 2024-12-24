const ipToLong = (components: string[]) => {
	let long = 0;
	let power = 1;

	for (let i = 3; i >= 0; i--) {
		long += power * Number(components[i]);
		power *= 256;
	}

	return long;
};

const isIpMatchingMask = (ip: string[], mask: string[]) => {
	const freedom = Math.pow(2, 32 - Number(mask[5]));
	const baseIp = ipToLong(mask.slice(1, 5));
	const long = ipToLong(ip.slice(1, 5));

	return (long >= baseIp) && (long < baseIp + freedom);
};

/**
 * Return true if host is an IP v4, exclusion is an IP v4 mask, and the IP matches the mask,
 * return false in any other case.
 *
 * We include broadcast and network address in the exclusion.
 */
export const isHostExcludedByIpMask = (host: string, exclusion: string) => {
	const mask = exclusion.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);

	if (!mask) {
		return false;
	}

	const hostIp = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)(:\d+)?$/);

	if (!hostIp) {
		return false;
	}

	return isIpMatchingMask(hostIp, mask);
};
