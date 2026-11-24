'use background';
import type {ConnectionState} from '../ConnectionState';
import {current, defineState} from './stateStore';
import {connect} from './actions';
import {cancelNextCredentialFetch} from '../../account/credentials/getConnectionCredentials';
import {setButton} from '../../tools/browserAction';
import {
	clearProxy,
	getProxyLevelOfControl,
	hasProxy,
	setProxyToWaiterHost,
} from '../../tools/proxy';
import {milliSeconds} from '../../tools/milliSeconds';
import {catchPromise} from '../../tools/triggerPromise';
import {notifyStateChange} from '../../tools/notifyStateChange';
import {getErrorAsString} from '../../tools/getErrorMessage';
import {bind, info as info_} from '../../log/log';
import {getProxyTakeoverReconnectionServer} from '../proxy/proxyTakeoverReconnection';
import {isKillSwitchArmed} from './killSwitch';

const info = bind(info_, '[state]');

let reconnectingAfterProxyTakeover = false;

/**
 * If disconnected by a proxy takeover, reconnect to the previous server
 * as soon as the other extension released the proxy settings.
 */
async function reconnectAfterProxyTakeover(
	state: ConnectionState,
): Promise<void> {
	if (reconnectingAfterProxyTakeover) {
		return;
	}

	reconnectingAfterProxyTakeover = true;

	try {
		const server = await getProxyTakeoverReconnectionServer();

		if (!server || state !== current()) {
			return;
		}

		// Fresh value, not the shared cache of checkProxyLevelOfControl()
		// which may still hold the level from before the takeover
		const levelOfControl = await getProxyLevelOfControl();

		if (
			levelOfControl !== 'controllable_by_this_extension' &&
			levelOfControl !== 'controlled_by_this_extension'
		) {
			return;
		}

		// User may have connected, disconnected or logged out meanwhile
		if (
			state !== current() ||
			(await getProxyTakeoverReconnectionServer()) !== server
		) {
			return;
		}

		info('Proxy control is back, reconnect to', server.name);
		await connect({server});
	} finally {
		reconnectingAfterProxyTakeover = false;
	}
}

// **** Logged in, but not connected ****
export const offState = defineState({
	name: 'off',
	initializedAt: 0,
	async init(config?: ConnectionState): Promise<void> {
		cancelNextCredentialFetch();
		const state = current();
		state.data = {};
		const error = config?.data?.error;

		if (error) {
			state.data.error =
				error instanceof Error
					? {
							message: error.message,
							stack: error.stack,
						}
					: error;
		}

		// Kill switch: keep the dead-end instead of going direct. If it can't be
		// set (proxy controlled by another extension or locked) nothing is blocked.
		const blocked =
			(await isKillSwitchArmed()) &&
			state === current() &&
			(await setProxyToWaiterHost());

		// Connected again meanwhile, its proxy must not be cleared
		if (state !== current()) {
			return;
		}

		state.data.blocked = blocked;
		notifyStateChange('disconnected', {error, blocked});

		setButton(error ? 'error' : 'off', error && getErrorAsString(error));

		if (!blocked) {
			await clearProxy();
		}
	},
	async refreshState(): Promise<void> {
		catchPromise(reconnectAfterProxyTakeover(current()));

		if (
			current().data.server &&
			Date.now() - this.initializedAt! > milliSeconds.fromSeconds(3) &&
			(await hasProxy())
		) {
			await connect(current().data);
		}
	},
	checkConnectingState(time: number): void {
		if (Date.now() - time > milliSeconds.fromSeconds(5)) {
			notifyStateChange('disconnected', {
				error:
					current().data?.error ||
					new Error('Connection initialization timeout'),
			});
		}
	},
});
