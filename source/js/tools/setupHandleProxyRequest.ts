'use background';
/// <reference types="firefox-webext-browser"/>
import type {ProxyInfo} from '../vpn/proxy/ProxyInfo';
import {getCurrentStateIfDefined} from '../vpn/state/stateStore';
import {initProxySettingsWatcher} from '../vpn/proxy/initProxySettingsWatcher';
import OnRequestDetails = browser.proxy._OnRequestDetails;

const handleProxyRequest = (
	requestInfo: OnRequestDetails,
): ProxyInfo | null | Promise<ProxyInfo> | undefined =>
	getCurrentStateIfDefined()?.handleProxyRequest?.(requestInfo);

export const setupHandleProxyRequest = (): boolean => {
	const proxy = browser.proxy;

	if (!proxy) {
		return false;
	}

	initProxySettingsWatcher();

	const onRequest = proxy.onRequest;

	// Only available on Firefox-type browsers
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
