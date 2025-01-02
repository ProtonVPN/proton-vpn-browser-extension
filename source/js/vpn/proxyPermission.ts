import {baseDomainURL} from '../config';
type Permissions = browser.permissions.Permissions;

const origins = [
	'http://*/*',
	'https://*/*',
	'ftp://*/*',
	'ws://*/*',
	'wss://*/*',
	'https://account.protonvpn.com/*',
	'https://account.proton.me/*',
];

if (baseDomainURL !== 'https://account.proton.me') {
	origins.push(baseDomainURL + '/*');
}

export const proxyPermission: Permissions = {
	permissions: ['proxy'],
	origins,
};
