module.exports = {
	appVersion: '1.2.9',
	appId: 'jplgfhpmjnbigmhklmmbgecoobifkmpa',
	baseDomainURL: 'https://account.proton.me',
	tokenDuration: 1200, // seconds
	proxyHost: null, // To enforce a specific host
	proxyPort: 4443,
	singleProxyPort: false, // If false, a range from proxyPort to proxyPort + 11 can be used, if true, only proxyPort is used
	proxySecureCorePort: 443,
	scheme: 'https', // Proxy scheme
	apiDomainsExclusion: [
		// hostname of baseDomainURL is automatically included in this list
	],
	proxyLocalNetworkExclusion: [
		'localhost',
		'127.0.0.1',
		'127.0.0.0/8',
		'127.0.0.1:80',
		'10.0.0.0/8',
		'172.16.0.0/12',
		'192.168.0.0/16',
		'[::1]',
		'<local>',
	],
	signupEnabled: true,
	/**
	 * For now TOR is disabled, server-side proxy requests won't be sent to the TOR network
	 * so connecting to Proton TOR servers will just be like connecting to non-TOR servers.
	 */
	torEnabled: false,
	incompatibleSoftware: [
		'Sophos',
		'Zscaler',
		'Kaspersky',
		'McAfee',
		'eblocker.org',
	],
	sentry: 'https://5c4abb94f5a644b38cf8e3261dfad0e3@reports.proton.me/api/core/v4/reports/sentry/67'
};
