import type {ServerSummary} from '../vpn/ConnectionState';
import {FingerprintGroup} from './FingerprintGroup';
import {getCountryLanguageTag, getSpoofedLanguage} from './getCountryLanguage';
import {getServerTimezone} from './getServerTimezone';
import type {SpoofedProfile} from './SpoofedProfile';

/**
 * The most common desktop configuration: values are picked to be shared
 * by the largest crowd, not to be random (random values are unique,
 * so they make users easier to recognize, not harder).
 */
const windowsPlatform = 'Windows NT 10.0; Win64; x64';

const commonScreen: Required<SpoofedProfile>['screen'] = {
	width: 1920,
	height: 1080,
	availWidth: 1920,
	// Minus the Windows taskbar
	availHeight: 1040,
	colorDepth: 24,
	pixelDepth: 24,
	devicePixelRatio: 1,
};

const commonHardware: Required<SpoofedProfile>['hardware'] = {
	hardwareConcurrency: 8,
	deviceMemory: 8,
};

export const isFirefoxUserAgent = (userAgent: string) =>
	/\bFirefox\/\d/.test(userAgent);

type WebglProfile = Required<SpoofedProfile>['webgl'];
type WebglSystem = 'windows' | 'mac' | 'linux';

const intelGpu: WebglProfile['gpu'] = {vendor: 'intel', architecture: 'gen-9'};

/**
 * Most common integrated graphics per OS, as each browser reports them
 * (Chromium goes through ANGLE, Firefox sanitizes the renderer to a
 * family name followed by ", or similar").
 */
const commonWebgl: Record<
	'chromium' | 'firefox',
	Record<WebglSystem, WebglProfile>
> = {
	chromium: {
		windows: {
			vendor: 'Google Inc. (Intel)',
			renderer:
				'ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00005917) Direct3D11 vs_5_0 ps_5_0, D3D11)',
			gpu: intelGpu,
		},
		mac: {
			vendor: 'Google Inc. (Apple)',
			renderer:
				'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
			gpu: {vendor: 'apple', architecture: 'metal-3'},
		},
		linux: {
			vendor: 'Google Inc. (Intel)',
			renderer:
				'ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)',
			gpu: intelGpu,
		},
	},
	firefox: {
		windows: {
			vendor: 'Google Inc. (Intel)',
			renderer:
				'ANGLE (Intel, Intel(R) HD Graphics 400 Direct3D11 vs_5_0 ps_5_0), or similar',
			gpu: intelGpu,
		},
		mac: {
			vendor: 'Apple',
			renderer: 'Apple M1, or similar',
			gpu: {vendor: 'apple', architecture: 'metal-3'},
		},
		linux: {
			vendor: 'Intel',
			renderer: 'Intel(R) HD Graphics, or similar',
			gpu: intelGpu,
		},
	},
};

/**
 * The graphics card must match the reported OS (a Direct3D renderer on a
 * Mac would be rarer than the real one), so it follows the spoofed OS when
 * the user agent group is enabled, else the real one.
 *
 * Mobile devices are too diverse to pick a common GPU: kept real.
 */
export const getSpoofedWebgl = (
	realUserAgent: string,
	spoofedOs: boolean,
): WebglProfile | undefined => {
	if (/\b(Android|iPhone|iPad|Mobile)\b/.test(realUserAgent) && !spoofedOs) {
		return undefined;
	}

	const system: WebglSystem =
		spoofedOs || /\bWindows\b/.test(realUserAgent)
			? 'windows'
			: /\b(Macintosh|Mac OS X)\b/.test(realUserAgent)
				? 'mac'
				: 'linux';
	const webgl =
		commonWebgl[isFirefoxUserAgent(realUserAgent) ? 'firefox' : 'chromium'][
			system
		];

	return {...webgl, gpu: {...webgl.gpu}};
};

/**
 * Keep the actual browser (name, engine and version, as the engine can be
 * detected anyway from its features) but claim the most common OS.
 *
 * Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
 * => Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
 *
 * Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0
 * => Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0
 */
export const getSpoofedUserAgent = (
	realUserAgent: string,
): Required<SpoofedProfile>['userAgent'] => {
	const userAgent = realUserAgent.replace(
		/\(([^)]*)\)/,
		(_, system: string) => {
			const revision = /;\s*(rv:[^;]+)$/.exec(system)?.[1];

			return `(${windowsPlatform}${revision ? `; ${revision}` : ''})`;
		},
	);
	const firefox = isFirefoxUserAgent(userAgent);

	return {
		userAgent,
		appVersion: firefox ? '5.0 (Windows)' : userAgent.replace(/^Mozilla\//, ''),
		platform: 'Win32',
		...(firefox ? {oscpu: windowsPlatform} : {}),
		clientHints: {
			platform: 'Windows',
			platformVersion: '10.0.0',
			architecture: 'x86',
			bitness: '64',
		},
	};
};

/**
 * The only server dependent data, everything else is derived from it (and
 * from the real user agent) the same way in the background (for headers)
 * and in pages (for JavaScript values), so they always match.
 */
export interface FingerprintSpec {
	groups: FingerprintGroup[];
	timezone?: string;
	language?: string;
	/** Canvas noise seed, random per connection (see getCanvasSeed) */
	seed?: number;
}

export const buildFingerprintSpec = (
	server: ServerSummary | undefined,
	groups: FingerprintGroup[],
	seed?: number,
): FingerprintSpec | undefined => {
	if (!server?.exitCountry || !groups.length) {
		return undefined;
	}

	const spec: FingerprintSpec = {groups: [...groups]};

	if (groups.includes(FingerprintGroup.TIMEZONE)) {
		const timezone = getServerTimezone(server);

		if (timezone) {
			spec.timezone = timezone;
		} else {
			// Unknown: keep the real one
			spec.groups = spec.groups.filter(
				(group) => group !== FingerprintGroup.TIMEZONE,
			);
		}
	}

	if (groups.includes(FingerprintGroup.LANGUAGE)) {
		spec.language = getCountryLanguageTag(server.exitCountry);
	}

	if (groups.includes(FingerprintGroup.CANVAS)) {
		if (seed === undefined) {
			spec.groups = spec.groups.filter(
				(group) => group !== FingerprintGroup.CANVAS,
			);
		} else {
			spec.seed = seed;
		}
	}

	return spec.groups.length ? spec : undefined;
};

export const buildProfileFromSpec = (
	spec: FingerprintSpec | undefined,
	realUserAgent: string,
): SpoofedProfile | undefined => {
	if (!spec) {
		return undefined;
	}

	const profile: SpoofedProfile = {};
	const firefox = isFirefoxUserAgent(realUserAgent);

	spec.groups.forEach((group) => {
		switch (group) {
			case FingerprintGroup.TIMEZONE:
				if (spec.timezone) {
					profile.timezone = spec.timezone;
				}

				break;

			case FingerprintGroup.LANGUAGE:
				if (spec.language) {
					profile.language = getSpoofedLanguage(spec.language, firefox);
				}

				break;

			case FingerprintGroup.USER_AGENT:
				profile.userAgent = getSpoofedUserAgent(realUserAgent);
				break;

			case FingerprintGroup.SCREEN:
				profile.screen = {...commonScreen};
				break;

			case FingerprintGroup.HARDWARE:
				profile.hardware = {...commonHardware};
				break;

			case FingerprintGroup.WEBGL: {
				const webgl = getSpoofedWebgl(
					realUserAgent,
					spec.groups.includes(FingerprintGroup.USER_AGENT),
				);

				if (webgl) {
					profile.webgl = webgl;
				}

				break;
			}

			case FingerprintGroup.CANVAS:
				if (spec.seed !== undefined) {
					profile.canvas = {seed: spec.seed};
				}

				break;
		}
	});

	return Object.keys(profile).length ? profile : undefined;
};

export const buildSpoofedProfile = (
	server: ServerSummary | undefined,
	groups: FingerprintGroup[],
	realUserAgent: string,
	seed?: number,
): SpoofedProfile | undefined =>
	buildProfileFromSpec(
		buildFingerprintSpec(server, groups, seed),
		realUserAgent,
	);
