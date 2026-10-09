import {baseDomainURL} from '../config';
import {getBrowser} from '../tools/getBrowser';

type Permissions = chrome.permissions.Permissions &
	browser.permissions.Permissions;

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

export const proxyPermission: Permissions =
	getBrowser().type === 'firefox'
		? {
				permissions: ['proxy'],
			}
		: {
				permissions: ['proxy'],
				origins,
			};

export const checkProxyPermission = async (): Promise<boolean> => {
	try {
		if (typeof browser !== 'undefined' && browser.permissions?.contains) {
			return await browser.permissions.contains(proxyPermission);
		}

		if (typeof chrome !== 'undefined' && chrome.permissions?.contains) {
			return await new Promise<boolean>((resolve) => {
				chrome.permissions.contains(proxyPermission, (ok) => {
					resolve(Boolean(ok));
				});
			});
		}
	} catch {
		return false;
	}

	return false;
};

export const requestProxyPermission = async (): Promise<boolean> => {
	try {
		if (typeof browser !== 'undefined' && browser.permissions?.request) {
			return await browser.permissions.request(proxyPermission);
		}

		if (typeof chrome !== 'undefined' && chrome.permissions?.request) {
			return await new Promise<boolean>((resolve) => {
				chrome.permissions.request(proxyPermission, (ok) => {
					resolve(Boolean(ok));
				});
			});
		}
	} catch {
		return false;
	}

	return false;
};

