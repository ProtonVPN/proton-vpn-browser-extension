import {ProxyInfo} from '../proxy';
import {getCurrentStateIfDefined} from '../state';
import OnRequestDetails = browser.proxy._OnRequestDetails;

const handleProxyRequest = (
	requestInfo: OnRequestDetails,
): ProxyInfo | Promise<ProxyInfo> | undefined => getCurrentStateIfDefined()
	?.handleProxyRequest?.(requestInfo);

export const setupHandleProxyRequest = (): boolean => {
	const proxy = chrome.proxy as any;

	if (!proxy) {
		return false;
	}

	const onRequest = proxy.onRequest;

	if (!onRequest) {
		return true;
	}

	if (!onRequest.hasListener(handleProxyRequest)) {
		onRequest.addListener(handleProxyRequest, {
			urls: ['<all_urls>'],
		});
	}

	return true;
};
