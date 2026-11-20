/* c8 ignore start */

/**
 * Values exposed to web pages (and HTTP headers) instead of the real ones,
 * a group is absent when it's not spoofed, then real values are kept.
 *
 * It must remain plain JSON as it's passed to the page script.
 */
export interface SpoofedProfile {
	/** IANA timezone, e.g. "Europe/Paris" */
	timezone?: string;
	language?: {
		language: string;
		languages: string[];
		acceptLanguage: string;
	};
	userAgent?: {
		userAgent: string;
		appVersion: string;
		platform: string;
		/** Firefox only */
		oscpu?: string;
		/** navigator.userAgentData (Chromium only) and Sec-CH-UA-* headers */
		clientHints: {
			platform: string;
			platformVersion: string;
			architecture: string;
			bitness: string;
		};
	};
	screen?: {
		width: number;
		height: number;
		availWidth: number;
		availHeight: number;
		colorDepth: number;
		pixelDepth: number;
		devicePixelRatio: number;
	};
	hardware?: {
		hardwareConcurrency: number;
		deviceMemory: number;
	};
	/** Graphics card, matching the (real or spoofed) operating system */
	webgl?: {
		/** UNMASKED_VENDOR_WEBGL (WEBGL_debug_renderer_info) */
		vendor: string;
		/** UNMASKED_RENDERER_WEBGL (WEBGL_debug_renderer_info) */
		renderer: string;
		/** GPUAdapterInfo (WebGPU, Chromium only) */
		gpu: {
			vendor: string;
			architecture: string;
		};
	};
	canvas?: {
		/** Mixed with the page origin: same noise for a site, per connection */
		seed: number;
	};
}

/* c8 ignore stop */
