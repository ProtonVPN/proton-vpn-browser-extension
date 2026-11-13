/**
 * Generic second-level labels used under country-code TLDs to form a public
 * suffix made of 2 parts, such as co.uk, com.au, ac.jp, gov.br, etc.
 */
const secondLevelLabels = new Set([
	'ac',
	'co',
	'com',
	'edu',
	'gob',
	'go',
	'gov',
	'gv',
	'ltd',
	'me',
	'mil',
	'ne',
	'net',
	'nic',
	'nom',
	'or',
	'org',
	'plc',
	'sch',
]);

/**
 * Get the domain a user would register (e.g. example.com, example.co.uk)
 * from a hostname (e.g. www.example.com, shop.example.co.uk).
 *
 * This is a lightweight heuristic and not a full Public Suffix List lookup:
 * a 2-part suffix is detected when the TLD is a 2-letter country code and
 * the label before it is a well-known generic second-level label.
 *
 * Hostnames not ending with an alphabetic TLD (such as IP addresses) are
 * returned unchanged.
 */
export const getRegistrableDomain = (hostname: string): string => {
	const labels = hostname.split('.');
	const tld = labels[labels.length - 1] || '';

	if (!/^(?:[a-z]+|xn--[a-z0-9-]+)$/i.test(tld)) {
		return hostname;
	}

	const secondLevel = (labels[labels.length - 2] || '').toLowerCase();
	const suffixLength =
		labels.length > 2 && tld.length === 2 && secondLevelLabels.has(secondLevel)
			? 2
			: 1;

	return labels.slice(-(suffixLength + 1)).join('.');
};
