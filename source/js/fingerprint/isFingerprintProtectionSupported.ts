/**
 * First Firefox version able to register content scripts in the page
 * (MAIN world), needed to spoof values before the page scripts run.
 * Chromium supports it since 102, below our minimum version.
 */
export const minimumFirefoxVersion = 128;

/**
 * Detected from the user agent (not runtime.getBrowserInfo) so that Firefox
 * forks (e.g. Waterfox) are checked against the Gecko version they're
 * based on, not their own version number.
 */
export const isFingerprintProtectionSupported = (
	userAgent = navigator.userAgent,
): boolean => {
	const firefoxVersion = /\bFirefox\/(\d+)/.exec(userAgent)?.[1];

	return !firefoxVersion || Number(firefoxVersion) >= minimumFirefoxVersion;
};
