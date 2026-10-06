import {appId} from '../config';

const isFirefox = () =>
	(typeof location !== 'undefined' && /^moz-extension:/.test(location.href)) ||
	(typeof navigator !== 'undefined' && /firefox|fxios/i.test(navigator.userAgent)) ||
	(typeof browser !== 'undefined' &&
		typeof browser.runtime?.getURL === 'function' &&
		/^moz-extension:/.test(browser.runtime.getURL('')));

export const getBrowser = () =>
	isFirefox()
		? {
				// moz-extension://
				name: 'Firefox',
				type: 'firefox' as const,
				pluginsUrl:
					'https://addons.mozilla.org/firefox/addon/proton-vpn-firefox-extension',
				storeReviewsUrl:
					'https://addons.mozilla.org/firefox/addon/proton-vpn-firefox-extension/reviews/',
			}
		: {
				// chrome-extension://
				name: 'Chrome',
				type: 'chromium' as const,
				pluginsUrl: 'chrome://extensions/',
				storeReviewsUrl: `https://chromewebstore.google.com/detail/proton-vpn-fast-secure/${appId}/reviews`,
			};
