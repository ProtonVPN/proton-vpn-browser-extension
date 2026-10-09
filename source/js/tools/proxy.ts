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

const isFixedServersProxy = (value: any): value is FixedServersProxy =>
	value.mode === 'fixed_servers' || value.mode === 'pac_script';

let proxySet = false;

let proxyErrorWatched = false;

const getProxyApi = (): any =>
	(typeof browser !== 'undefined' && browser.proxy) || chrome.proxy;

export const hasProxy = async (): Promise<boolean> => {
	const proxyApi = getProxyApi();

	if (!proxyApi) {
		return false;
	}

	try {
		return await timeoutAfter(
			new Promise<boolean>(async (resolve) => {
				try {
					let details: any;
					if (typeof browser !== 'undefined' && browser.proxy?.settings?.get) {
						details = await browser.proxy.settings.get({});
					} else if (proxyApi.settings?.get) {
						details = await new Promise((res) => {
							try {
								const r = proxyApi.settings.get({}, (d: any) => res(d));
								if (r && typeof r.then === 'function') {
									r.then(res).catch(() => res(undefined));
								}
							} catch {
								res(undefined);
							}
						});
					}

					resolve(
						Boolean(
							details?.levelOfControl === 'controlled_by_this_extension' ||
								(details?.value?.mode
									? isFixedServersProxy(details?.value)
									: details?.levelOfControl === 'controllable_by_this_extension' &&
										(await isConnected())),
						),
					);
				} catch {
					resolve(false);
				}
			}),
			milliSeconds.fromSeconds(5),
			'Unable to check proxy settings',
		);
	} catch {
		return false;
	}
};

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
				return "${proxy.rules.singleProxy.scheme.toUpperCase()} ${proxy.rules.singleProxy.host}:${proxy.rules.singleProxy.port}";
			}

			return "DIRECT";
		}`,
	},
});

const setProxy = async (
	value: FixedServersProxy | SystemProxy | PacScript,
): Promise<boolean> => {
	const proxyApi = getProxyApi();

	if (!proxyApi || !setupHandleProxyRequest()) {
		return false;
	}

	proxySet = true;
	initAuthInterceptor();

	if (!proxyErrorWatched) {
		proxyErrorWatched = true;
		proxyApi.onProxyError?.addListener?.(async (event: any) => {
			switch (getErrorCode(event.error)) {
				case ErrorCode.TIMED_OUT:
				case ErrorCode.TUNNEL_CONNECTION_FAILED:
				case ErrorCode.PROXY_CONNECTION_FAILED:
					retryCredentials(true);
					break;
			}
		});
	}

	triggerPromise(
		isFixedServersProxy(value)
			? preventLeak()
			: setWebRTCState(WebRTCState.CLEAR),
	);

	// In Firefox, proxy routing is handled dynamically via browser.proxy.onRequest.
	// Only Chromium requires chrome.proxy.settings.set with FixedServersProxy / PAC script.
	if (proxyApi.onRequest) {
		const promise = browser?.webRequest?.handlerBehaviorChanged?.();
		if (promise) {
			await promise.catch(() => {});
		}

		return true;
	}

	return await new Promise<boolean>((resolve) => {
		try {
			proxyApi.settings.set(
				{
					value,
					scope: 'regular',
				},
				() => {
					hasProxy()
						.then((result) => {
							const promise = browser?.webRequest?.handlerBehaviorChanged?.();

							if (!promise) {
								return result;
							}

							return promise.then(() => result);
						})
						.then(resolve)
						.catch(() => resolve(false));
				},
			);
		} catch {
			resolve(false);
		}
	});
};

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

export const proxyToServer = async (
	server: ProxyServer,
	splitTunneling: SplitTunnelingConfig = {},
) => {
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

export const setProxyToWaiterHost = async (): Promise<boolean> =>
	await setProxy(
		getFixedServerConfig(
			'localhost', // 127.0.0.1
			9,
		),
	);

export const clearProxy = async (): Promise<boolean> => {
	const proxyApi = getProxyApi();

	if (!proxyApi) {
		return false;
	}

	proxySet = false;

	if (!proxySet) {
		clearAuthInterceptor();
		triggerPromise(setWebRTCState(WebRTCState.CLEAR));
	}

	try {
		if (typeof browser !== 'undefined' && browser.proxy?.settings?.clear) {
			await browser.proxy.settings.clear({});

			return true;
		}

		if (proxyApi.settings?.clear) {
			return await new Promise<boolean>((resolve) => {
				try {
					const r = proxyApi.settings.clear({}, (success: boolean | void) => {
						resolve(success !== false);
					});
					if (r && typeof r.then === 'function') {
						r.then((s: any) => resolve(s !== false)).catch(() => resolve(false));
					}
				} catch {
					resolve(false);
				}
			});
		}
	} catch {
		return false;
	}

	return true;
};
