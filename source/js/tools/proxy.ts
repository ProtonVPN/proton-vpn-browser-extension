import {triggerPromise} from './triggerPromise';
import {setWebRTCState} from '../webrtc/setWebRTCState';
import {WebRTCState} from '../webrtc/state';
import {preventLeak} from '../webrtc/preventLeak';
import {isConnected} from '../vpn/connectedServer';
import {setupHandleProxyRequest} from './setupHandleProxyRequest';
import {clearAuthInterceptor, initAuthInterceptor} from '../vpn/initAuthInterceptor';
import {backgroundOnly} from '../context/backgroundOnly';
import {timeoutAfter} from '../tools/delay';
import {milliSeconds} from '../tools/milliSeconds';

backgroundOnly('proxy');

interface SystemProxy {
	mode: 'system',
}

interface FixedServersProxy {
	mode: 'fixed_servers';
	rules: {
		singleProxy: {
			scheme: string;
			host: string;
			port: number;
		};
		bypassList: string[];
	};
}

const isFixedServersProxy = (value: any): value is FixedServersProxy => value.mode === 'fixed_servers';

let proxySet = false;

export const setProxy = (value: FixedServersProxy | SystemProxy): Promise<boolean> => new Promise(resolve => {
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
			.then(resolve);
	});

	triggerPromise(
		isFixedServersProxy(value)
			? preventLeak()
			: setWebRTCState(WebRTCState.CLEAR),
	);
});

export const clearProxy = (): Promise<boolean> => new Promise<boolean>(resolve => {
	if (!chrome.proxy) {
		resolve(false);

		return;
	}

	proxySet = false;
	chrome.proxy.settings.clear({}, (success: boolean) => {
		if (!proxySet) {
			clearAuthInterceptor();
			triggerPromise(setWebRTCState(WebRTCState.CLEAR));
		}

		resolve(success);
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
