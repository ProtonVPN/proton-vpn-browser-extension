'use background';
import {connectedServer} from './connectedServer';
import {
	getCurrentState,
	isCurrentStateConnected,
	isLoggedIn,
	waitForReadyState,
} from '../state';
import {milliSeconds} from '../tools/milliSeconds';
import {debug as debug_, bind} from '../log/log';
import {broadcastMessage} from '../tools/broadcastMessage';
import type {ApiError} from '../api/ApiError';
import {updateLocation} from './updateLocation';
import {updateLogicalLoad} from './updateLogicalLoad';
import {recoverState} from './recoverState';
import {watchWithSentry} from '../tools/sentry';
import {clearProxy} from '../tools/proxy';
import {markProxyRoutingReady} from '../tools/setupHandleProxyRequest';
import {isKillSwitchArmed} from './state/killSwitch';

const debug = bind(debug_, '[initState]');

export const initState = async () => {
	debug('Init state', new Error().stack);

	try {
		await waitForReadyState();
		const server = (await connectedServer.get())?.value;
		debug(server);

		if (!(server ? isCurrentStateConnected() : isLoggedIn())) {
			debug(server ? 'Not connected' : 'Not logged in');

			try {
				await recoverState(server);
			} catch (e) {
				broadcastMessage('changeState', {
					state: 'disconnected',
					server: undefined,
					error: e as ApiError,
				});
			}
		}
	} finally {
		// Even if the restoration failed, requests held by proxy.onRequest since
		// startup must be released, and must not end up on the waiter host
		// dead-end left in proxy.settings unless we are actually connected
		// or the kill switch blocks the traffic
		try {
			if (!isCurrentStateConnected() && !(await isKillSwitchArmed())) {
				await clearProxy();
			}
		} finally {
			markProxyRoutingReady();
		}
	}

	setInterval(
		() =>
			watchWithSentry(() => {
				getCurrentState().refreshState?.();
			}),
		milliSeconds.fromSeconds(1),
	);

	updateLocation();
	updateLogicalLoad();
};
