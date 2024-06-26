export const getBrowser = () => /^moz-extension:/.test(location.href) ? {
	name: 'Firefox',
	type:'firefox',
	pluginsUrl: 'https://addons.mozilla.org/firefox/addon/proton-vpn-firefox-extension',
} : {
	name: 'Chrome',
	type: 'chromium',
	pluginsUrl: 'chrome://extensions/',
};
