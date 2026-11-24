'use background';
/// <reference types="firefox-webext-browser"/>
import type {ProxyInfo} from '../vpn/proxy/ProxyInfo';
import {getCurrentStateIfDefined} from '../vpn/state/stateStore';
import {initProxySettingsWatcher} from '../vpn/proxy/initProxySettingsWatcher';
import {isApiRequest} from '../vpn/proxy/proxyExclusion';
import {waiterHostProxyInfo} from '../vpn/proxy/waiterHost';
import {delay} from './delay';
import {milliSeconds} from './milliSeconds';
import OnRequestDetails = browser.proxy._OnRequestDetails;

type ProxyRequestResult =
	ProxyInfo | null | undefined | Promise<ProxyInfo | null | undefined>;

/**
 * How long a request is held while the state is restored, after which it
 * fails closed on the waiter host dead-end.
 */
export const startupRoutingTimeout = milliSeconds.fromSeconds(15);

let routingReady = false;

let markRoutingReady: () => void;

const routingReadyPromise = new Promise<void>((resolve) => {
	markRoutingReady = resolve;
});

/**
 * To be called once the actual state is restored (connected or not), so
 * that requests held since the background started can be routed.
 */
export const markProxyRoutingReady = (): void => {
	routingReady = true;
	markRoutingReady();
};

/**
 * undefined (as returned when the state does not handle proxy requests)
 * makes Firefox use proxy.settings, which are cleared when not connected.
 */
const routeRequest = (requestInfo: OnRequestDetails): ProxyRequestResult => {
	// A failure (such as an API timeout while fetching credentials) must not
	// leave Firefox pick a route on its own, the request fails closed instead
	try {
		const result =
			getCurrentStateIfDefined()?.handleProxyRequest?.(requestInfo);

		return result instanceof Promise
			? result.catch(() => waiterHostProxyInfo)
			: result;
	} catch {
		return waiterHostProxyInfo;
	}
};

const handleProxyRequest = (
	requestInfo: OnRequestDetails,
): ProxyRequestResult => {
	if (routingReady) {
		return routeRequest(requestInfo);
	}

	// The state restoration itself calls the API, holding its requests
	// would be a deadlock, and the API is never proxied anyway
	if (isApiRequest(requestInfo)) {
		return null; // direct
	}

	// Hold the request until we know whether it must go through the proxy,
	// so it neither leaks (direct) nor fails (dead-end) during the startup
	return Promise.race([routingReadyPromise, delay(startupRoutingTimeout)]).then(
		() => (routingReady ? routeRequest(requestInfo) : waiterHostProxyInfo),
	);
};

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
