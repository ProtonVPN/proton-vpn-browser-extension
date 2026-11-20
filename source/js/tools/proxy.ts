'use background';
import {triggerPromise} from './triggerPromise';
import {setWebRTCState} from '../webrtc/setWebRTCState';
import {WebRTCState} from '../webrtc/state';
import {preventLeak} from '../webrtc/preventLeak';
import {isConnected} from '../vpn/connectedServer';
import {setupHandleProxyRequest} from './setupHandleProxyRequest';
import {
	clearAuthInterceptor,
	initAuthInterceptor,
} from '../vpn/initAuthInterceptor';
import {timeoutAfter} from '../tools/delay';
import {milliSeconds} from '../tools/milliSeconds';
import {ErrorCode, getErrorCode} from '../tools/getErrorCode';
import {retryCredentials} from './retryCredentials';
import {
	apiDomainsExclusion,
	excludeApiFromProxy,
	proxyLocalNetworkExclusion,
	scheme,
} from '../config';
import type {ProxyServer, SplitTunnelingConfig} from '../vpn/ConnectionState';
import {getIncludeOnlyList} from '../vpn/getIncludeOnlyList';
import {getBypassList} from '../vpn/getBypassList';
import {usesFirefoxProxySettings} from '../vpn/proxy/usesFirefoxProxySettings';
import {warn} from '../log/log';
import {waiterHost, waiterPort} from '../vpn/proxy/waiterHost';

interface PacScript {
	mode: 'pac_script';
	pacScript: {data: string};
}

interface SystemProxy {
	mode: 'system';
}

interface FixedServersProxy {
	mode: 'fixed_servers';
	rules: {
		singleProxy: {
			scheme: 'http' | 'https'; // https is the only protocol authorized in production
			host: string;
			port: number;
		};
		includeOnly?: string[];
		bypassList: string[];
	};
}

/**
 * Shape of proxy.settings expected by Firefox, which ignores the Chrome
 * one ({mode, rules}) and falls back to proxyType: 'system' instead.
 */
interface FirefoxManualProxy {
	proxyType: 'manual';
	http: string;
	httpProxyAll: true;
	passthrough: string;
}

type ProxySettings =
	chrome.types.ChromeSettingGetResult<chrome.proxy.ProxyConfig> | undefined;

const isFixedServersProxy = (value: object): value is FixedServersProxy =>
	(
		value as {
			mode?: string;
		}
	).mode === 'fixed_servers' ||
	(
		value as {
			mode?: string;
		}
	).mode === 'pac_script';

const isFirefoxManualProxy = (value: object): value is FirefoxManualProxy =>
	(
		value as {
			proxyType?: string;
		}
	).proxyType === 'manual';

let proxySet = false;

let proxyErrorWatched = false;

export const getProxySettings = async (): Promise<ProxySettings> =>
	await timeoutAfter(
		new Promise((resolve) => {
			if (!chrome.proxy) {
				resolve(undefined);

				return;
			}

			chrome.proxy.settings.get({}, resolve);
		}),
		milliSeconds.fromSeconds(5),
		'Unable to check proxy settings',
	);

export const getProxyLevelOfControl = async (): Promise<
	chrome.types.LevelOfControl | undefined
> => (await getProxySettings())?.levelOfControl;

/**
 * True when another extension took precedence over the proxy settings,
 * so what we set is ignored by the browser.
 */
export const isProxyControlledByOtherExtensions = async (): Promise<boolean> =>
	(await getProxyLevelOfControl()) === 'controlled_by_other_extensions';

export const isProxyControlledAndConnected = async (
	details: ProxySettings,
): Promise<boolean> => {
	if (
		!details ||
		// Another extension took precedence, what we set is ignored
		details.levelOfControl === 'controlled_by_other_extensions' ||
		// Locked by browser configuration or policy, no extension can set it
		details.levelOfControl === 'not_controllable'
	) {
		return false;
	}

	return (
		details.levelOfControl === 'controlled_by_this_extension' ||
		(details.value?.mode
			? isFixedServersProxy(details.value)
			: details.levelOfControl === 'controllable_by_this_extension' &&
				(await isConnected()))
	);
};

export const hasProxy = async (): Promise<boolean> =>
	await isProxyControlledAndConnected(await getProxySettings());

const buildDomainMatchingCondition = (domain: string) => {
	if (domain.startsWith('.')) {
		return `host.endsWith(${JSON.stringify(domain)})`;
	}

	const mask = domain.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);

	if (mask) {
		let val = Number(mask[2]);

		return `isInNet(host, "${mask[1]}", "${[255, 255, 255, 255]
			.map(() =>
				[...Array.from(Array(8).keys())].reduce(
					(rst) => rst * 2 + Number(val-- > 0),
					0,
				),
			)
			.join('.')}")`;
	}

	return `(host === ${JSON.stringify(domain)})`;
};

const buildDomainListCondition = (domains: string[]) =>
	domains.map((domain) => buildDomainMatchingCondition(domain)).join(' || ');

const getExcludeCondition = (proxy: FixedServersProxy): string => {
	return buildDomainListCondition(
		proxy.rules.bypassList.filter(
			(exclusion) => !proxyLocalNetworkExclusion.includes(exclusion), // Those will be handled by dnsResolve()
		),
	);
};

const getIncludeCondition = (proxy: FixedServersProxy): string => {
	const includeOnly = proxy.rules.includeOnly;
	const exclusion = getExcludeCondition(proxy);

	if (typeof includeOnly === 'undefined') {
		return exclusion ? `!(${exclusion})` : 'true';
	}

	const inclusion = buildDomainListCondition(includeOnly);

	if (!inclusion) {
		return 'false';
	}

	return exclusion ? `!(${exclusion}) && (${inclusion})` : inclusion;
};

const getPacScriptProxyRoute = (proxy: FixedServersProxy) =>
	`${proxy.rules.singleProxy.scheme.toUpperCase()} ${proxy.rules.singleProxy.host}:${proxy.rules.singleProxy.port}`;

/**
 * PAC Script is for Chrome, in Firefox, logic is overridden by handleProxyRequest()
 */
export const getPacScript = (proxy: FixedServersProxy): PacScript => ({
	mode: 'pac_script',
	pacScript: {
		data: `function FindProxyForURL(url, host) {
			var isLocal = /^\\d+(\\.\\d+){3}$/.test(host) && (
				isInNet(host, "192.0.2.0", "255.255.255.0")
				|| /^(0|10|127|192\\.168|172\\.1[6789]|172\\.2[0-9]|172\\.3[01]|169\\.254|192\\.88\\.99)\\.[0-9.]+$/.test(host)
			);

			if (isLocal || isPlainHostName(host)) {
				return "DIRECT";
			}

			if (${getIncludeCondition(proxy)}) {
				return ${JSON.stringify(getPacScriptProxyRoute(proxy))};
			}

			return "DIRECT";
		}`,
	},
});

/**
 * Only the proxy host and the bypass list can be expressed this way (no HTTPS
 * proxy, no include-only list), it's enough for a dead-end, actual proxying
 * in Firefox is done by handleProxyRequest().
 */
export const getFirefoxManualProxy = (
	proxy: FixedServersProxy,
): FirefoxManualProxy => ({
	proxyType: 'manual',
	http: `${proxy.rules.singleProxy.host}:${proxy.rules.singleProxy.port}`,
	httpProxyAll: true,
	passthrough: proxy.rules.bypassList.join(', '),
});

const setProxy = (
	value: FixedServersProxy | SystemProxy | PacScript | FirefoxManualProxy,
): Promise<boolean> =>
	new Promise((resolve) => {
		if (!chrome.proxy || !setupHandleProxyRequest()) {
			resolve(false);

			return;
		}

		proxySet = true;
		initAuthInterceptor();
		chrome.proxy.settings.set(
			{
				value: value as chrome.proxy.ProxyConfig,
				scope: 'regular',
			},
			() => {
				// Must be read in the callback, it is reset right after
				const error = chrome.runtime.lastError?.message;

				if (error) {
					warn('Unable to set proxy settings: ' + error);

					// In Chrome the settings are the routing itself, the previous
					// value is still active, so the requested proxy is not applied.
					// In Firefox routing is done by proxy.onRequest, settings are
					// only the fail-closed fallback, so connection still works.
					if (!usesFirefoxProxySettings()) {
						resolve(false);

						return;
					}
				}

				hasProxy()
					.then((result) => {
						const promise = browser?.webRequest?.handlerBehaviorChanged?.();

						if (!promise) {
							return result;
						}

						return promise.then(() => result);
					})
					.then((result) => {
						if (!proxyErrorWatched) {
							proxyErrorWatched = true;
							chrome.proxy.onProxyError?.addListener?.(async (event) => {
								switch (getErrorCode(event.error)) {
									case ErrorCode.TIMED_OUT:
									case ErrorCode.TUNNEL_CONNECTION_FAILED:
									case ErrorCode.PROXY_CONNECTION_FAILED:
										retryCredentials(true);
										break;
								}
							});
						}

						resolve(result);
					});
			},
		);

		triggerPromise(
			isFixedServersProxy(value) || isFirefoxManualProxy(value)
				? preventLeak()
				: setWebRTCState(WebRTCState.CLEAR),
		);
	});

export const getFixedServerConfig = (
	host: string,
	port: number,
	splitTunneling: SplitTunnelingConfig = {},
): FixedServersProxy => {
	const config: FixedServersProxy = {
		mode: 'fixed_servers',
		rules: {
			singleProxy: {
				scheme,
				host,
				port,
			},
			bypassList: [
				...getBypassList(splitTunneling),
				...(excludeApiFromProxy ? apiDomainsExclusion : []),
				...proxyLocalNetworkExclusion,
			],
		},
	};

	const includeOnly = getIncludeOnlyList(splitTunneling);

	if (typeof includeOnly !== 'undefined') {
		config.rules.includeOnly = includeOnly;
	}

	return config;
};

const getWaiterHostConfig = (splitTunneling: SplitTunnelingConfig = {}) =>
	getFixedServerConfig(waiterHost, waiterPort, splitTunneling);

export const proxyToServer = async (
	server: ProxyServer,
	splitTunneling: SplitTunnelingConfig = {},
) => {
	if (usesFirefoxProxySettings()) {
		// proxy.settings in Firefox cannot express an HTTPS proxy, actual routing
		// is done by handleProxyRequest(), settings only keep the dead-end so
		// that anything it does not handle fails closed instead of going direct
		return await setProxy(
			getFirefoxManualProxy(getWaiterHostConfig(splitTunneling)),
		);
	}

	const config = getFixedServerConfig(
		server.proxyHost,
		server.proxyPort,
		splitTunneling,
	);

	return await setProxy(
		typeof config.rules.includeOnly === 'undefined'
			? config
			: getPacScript(config),
	);
};

export const setProxyToWaiterHost = async (): Promise<boolean> => {
	const config = getWaiterHostConfig();

	return await setProxy(
		usesFirefoxProxySettings() ? getFirefoxManualProxy(config) : config,
	);
};

export const clearProxy = (): Promise<boolean> =>
	new Promise<boolean>((resolve) => {
		if (!chrome.proxy) {
			resolve(false);

			return;
		}

		proxySet = false;
		chrome.proxy.settings.clear({}, (success: boolean | void) => {
			if (!proxySet) {
				clearAuthInterceptor();
				triggerPromise(setWebRTCState(WebRTCState.CLEAR));
			}

			resolve(Boolean(success));
		});
	});
