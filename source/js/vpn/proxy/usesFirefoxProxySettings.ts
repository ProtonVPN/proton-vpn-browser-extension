'use background';
/// <reference types="firefox-webext-browser"/>

/**
 * proxy.onRequest only exists in the Gecko proxy API, which also comes
 * with the Firefox shape for proxy.settings.
 */
export const usesFirefoxProxySettings = (): boolean =>
	typeof browser !== 'undefined' && Boolean(browser.proxy?.onRequest);
