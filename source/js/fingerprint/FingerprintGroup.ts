/**
 * Groups of browser properties that can be spoofed while connected so the
 * browser looks like many others ("hide in the crowd") instead of exposing
 * values that, combined, make it easy to recognize.
 *
 * Each group is toggled individually: e.g. one can keep the real language
 * (to still get pages in their language) but spoof everything else.
 */
export enum FingerprintGroup {
	/** Date, Intl and Temporal timezone, matched to the server city */
	TIMEZONE = 'timezone',
	/** navigator.language(s), default Intl locale and Accept-Language */
	LANGUAGE = 'language',
	/** User agent string, platform and client hints (OS part only) */
	USER_AGENT = 'user-agent',
	/** Screen resolution, pixel ratio and number of screens */
	SCREEN = 'screen',
	/** CPU cores and device memory */
	HARDWARE = 'hardware',
	/** Graphics card vendor and renderer (WebGL and WebGPU) */
	WEBGL = 'webgl',
	/** Faint per-site noise on canvas image readings */
	CANVAS = 'canvas',
}

export const fingerprintGroups: readonly FingerprintGroup[] = [
	FingerprintGroup.TIMEZONE,
	FingerprintGroup.LANGUAGE,
	FingerprintGroup.USER_AGENT,
	FingerprintGroup.SCREEN,
	FingerprintGroup.HARDWARE,
	FingerprintGroup.WEBGL,
	FingerprintGroup.CANVAS,
];

/** Storage key and managed config key, also the popup toggle class prefix */
export const getFingerprintGroupKey = (group: FingerprintGroup) =>
	`spoof-${group}`;
