'use popup';
import {hasBrowserPermission} from '../../tools/hasBrowserPermission';
import {proxyPermission} from './proxyPermission';

export const checkProxySupport = async (
	askProxyPermission: () => void,
): Promise<boolean | undefined> => {
	if (!chrome.proxy) {
		askProxyPermission();

		return undefined;
	}

	const ok = await hasBrowserPermission(proxyPermission);

	if (!ok) {
		askProxyPermission();
	}

	return ok;
};
