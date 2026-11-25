'use background';
import {isKillSwitchBlocking} from './state/actions';
import {triggerPromise} from '../tools/triggerPromise';

/**
 * Chrome: net::ERR_PROXY_CONNECTION_FAILED, net::ERR_TUNNEL_CONNECTION_FAILED
 * Firefox: NS_ERROR_PROXY_CONNECTION_REFUSED
 */
const deadEndError = /PROXY_CONNECTION|TUNNEL_CONNECTION/;

const onPageError = (details: {
	tabId: number;
	url: string;
	error?: string;
}): void => {
	if (
		details.tabId < 0 ||
		!/^https?:/.test(details.url) ||
		!deadEndError.test(details.error || '') ||
		!isKillSwitchBlocking()
	) {
		return;
	}

	triggerPromise(
		chrome.tabs.update(details.tabId, {
			url: chrome.runtime.getURL(
				`blocked.html?url=${encodeURIComponent(details.url)}`,
			),
		}),
	);
};

/**
 * When the kill switch blocks a page, replace the browser proxy error page
 * with an explanation and Reconnect / Disconnect buttons.
 */
export const initKillSwitchPage = (): void => {
	const webRequest = chrome.webRequest;

	if (
		!webRequest?.onErrorOccurred ||
		webRequest.onErrorOccurred.hasListener(onPageError)
	) {
		return;
	}

	webRequest.onErrorOccurred.addListener(onPageError, {
		urls: ['<all_urls>'],
		types: ['main_frame'],
	});
};
