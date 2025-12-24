'use background';
import {triggerPromise} from './triggerPromise';
import {setWebRTCState} from '../webrtc/setWebRTCState';
import {WebRTCState} from '../webrtc/state';
import {preventLeak} from '../webrtc/preventLeak';
import {isConnected} from '../vpn/connectedServer';
import {setupHandleProxyRequest} from './setupHandleProxyRequest';
import {clearAuthInterceptor, initAuthInterceptor} from '../vpn/initAuthInterceptor';
import {timeoutAfter} from '../tools/delay';
import {milliSeconds} from '../tools/milliSeconds';
import {ErrorCode, getErrorCode} from '../tools/getErrorCode';
import {retryCredentials} from './retryCredentials';
import {apiDomainsExclusion, excludeApiFromProxy, proxyLocalNetworkExclusion, scheme} from '../config';
import type {SplitTunnelingConfig} from '../vpn/ConnectionState';
import {getIncludeOnlyList} from '../vpn/getIncludeOnlyList';
import {getBypassList} from '../vpn/getBypassList';

interface PacScript {
	mode: 'pac_script',
	pacScript: {data: string},
}

interface SystemProxy {
	mode: 'system',
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

const isFixedServersProxy = (value: any): value is FixedServersProxy => (
	value.mode === 'fixed_servers'
	|| value.mode === 'pac_script'
);

let proxySet = false;

let proxyErrorWatched = false;

export const setProxy = (
	value: FixedServersProxy | SystemProxy | PacScript,
): Promise<boolean> => new Promise(resolve => {
	if (!chrome.proxy || !setupHandleProxyRequest()) {
		resolve(false);

		return;
	}

	proxySet = true;
	initAuthInterceptor();
	chrome.proxy.settings.set({
		value,
		scope: 'regular',
	}, () => {
		hasProxy()
			.then((result) => {
				const promise = browser?.webRequest?.handlerBehaviorChanged?.();

				if (!promise) {
					return result;
				}

				return promise.then(() => result);
			})
			.then(result => {
				if (!proxyErrorWatched) {
					proxyErrorWatched = true;
					chrome.proxy.onProxyError?.addListener?.(async event => {
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
	});

	triggerPromise(
		isFixedServersProxy(value)
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

const buildDomainListCondition = (domains: string[]) => domains.map(
	domain => domain.startsWith('.')
		? `host.endsWith(${JSON.stringify(domain)})`
		: `(host === ${JSON.stringify(domain)})`,
).join(' || ');

const getExcludeCondition = (proxy: FixedServersProxy): string => {
	return buildDomainListCondition(proxy.rules.bypassList);
};

const getIncludeCondition = (proxy: FixedServersProxy): string => {
	const includeOnly = proxy.rules.includeOnly;

	if (typeof includeOnly === 'undefined') {
		return `!(${getExcludeCondition(proxy)})`;
	}

	return `!(${getExcludeCondition(proxy)}) && (${buildDomainListCondition(includeOnly)})`;
};

/**
 * PAC Script is for Chrome, in Firefox, logic is overridden by handleProxyRequest()
 */
export const getPacScript = (proxy: FixedServersProxy): PacScript => ({
	mode: 'pac_script',
	pacScript: {
		data: `function FindProxyForURL(url, host) {
			if (${getIncludeCondition(proxy)}) {
				return "${proxy.rules.singleProxy.scheme.toUpperCase()} ${proxy.rules.singleProxy.host}:${proxy.rules.singleProxy.port}";
			}

			return "DIRECT";
		}`,
	},
});

export const setProxyToWaiterHost = async (): Promise<boolean> => await setProxy(getFixedServerConfig(
	'localhost', // 127.0.0.1
	9,
));

export const clearProxy = (): Promise<boolean> => new Promise<boolean>(resolve => {
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

export const hasProxy = async (): Promise<boolean> => await timeoutAfter(
	new Promise(resolve => {
		if (!chrome.proxy) {
			resolve(false);

			return;
		}

		chrome.proxy.settings.get({}, async details => {
			resolve(details?.levelOfControl === 'controlled_by_this_extension' || (
				details?.value?.mode
					? isFixedServersProxy(details?.value)
					: (
						details?.levelOfControl === 'controllable_by_this_extension' &&
						(await isConnected())
					)
			));
		});
	}),
	milliSeconds.fromSeconds(5),
	'Unable to check proxy settings',
);
