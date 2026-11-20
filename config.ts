export const appVersion = '1.3.9';
export const appId = 'jplgfhpmjnbigmhklmmbgecoobifkmpa';
export const baseDomainURL = 'https://account.proton.me';
export const tokenDuration = 1200; // seconds
export const proxyHost = null; // To enforce a specific host
export const proxyPort = 4443;
export const singleProxyPort = false; // If false, a range from proxyPort to proxyPort + 11 can be used, if true, only proxyPort is used
export const proxySecureCorePort = 443;
export const scheme = 'https'; // Proxy scheme
export const apiDomainsExclusion = [
	// hostname of baseDomainURL is automatically included in this list
];
export const proxyLocalNetworkExclusion = [
	'localhost',
	'127.0.0.1',
	'127.0.0.0/8',
	'127.0.0.1:80',
	'10.0.0.0/8',
	'172.16.0.0/12',
	'192.168.0.0/16',
	'[::1]',
	'<local>',
];
export const lastChoicesMemoryLimit = 5;
export const signupEnabled = true;
/**
 * For now TOR is disabled, server-side proxy requests won't be sent to the TOR network
 * so connecting to Proton TOR servers will just be like connecting to non-TOR servers.
 */
export const torEnabled = false;
export const incompatibleSoftware = [
	'ANSES',
	'Bitdefender',
	'eblocker.org',
	'ESET Endpoint Security',
	'Kaspersky',
	'McAfee',
	'opendns.com',
	'Sophos',
	'Zscaler',
];
export const sentry =
	'https://5c4abb94f5a644b38cf8e3261dfad0e3@reports.proton.me/api/core/v4/reports/sentry/67';
