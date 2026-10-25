'use background';
import {isKillSwitchBlocking} from '../state';
import {getGlobalBrowser} from '../tools/getGlobalBrowser';
import {triggerPromise} from '../tools/triggerPromise';

/**
 * When the kill switch blocks a page, replace the browser proxy error page
 * with an explanation and Reconnect / Disconnect buttons.
 */
export const initKillSwitchPage = (): void => {
	const browser = getGlobalBrowser();

	browser.webRequest?.onErrorOccurred.addListener(
		(details) => {
			if (
				details.tabId < 0 ||
				!/^https?:/.test(details.url) ||
				// Chrome: net::ERR_PROXY_CONNECTION_FAILED, Firefox: NS_ERROR_PROXY_CONNECTION_REFUSED
				!/PROXY_CONNECTION|TUNNEL_CONNECTION/.test(details.error) ||
				!isKillSwitchBlocking()
			) {
				return;
			}

			triggerPromise(
				browser.tabs.update(details.tabId, {
					url: browser.runtime.getURL(
						`blocked.html?url=${encodeURIComponent(details.url)}`,
					),
				}),
			);
		},
		{urls: ['<all_urls>'], types: ['main_frame']},
	);
};
