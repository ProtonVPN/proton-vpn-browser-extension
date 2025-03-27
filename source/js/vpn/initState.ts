import {connectedServer} from './connectedServer';
import {getCurrentState, isCurrentStateConnected, isLoggedIn, waitForReadyState} from '../state';
import {milliSeconds} from '../tools/milliSeconds';
import {debug} from '../log/log';
import {broadcastMessage} from '../tools/broadcastMessage';
import {ApiError} from '../api';
import {updateLocation} from './updateLocation';
import {updateLogicalLoad} from './updateLogicalLoad';
import {recoverState} from './recoverState';
import {watchWithSentry} from '../tools/sentry';
import {clearProxy} from '../tools/proxy';

export const initState = async () => {
	debug('Init state', (new Error()).stack);

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

	if (!isCurrentStateConnected()) {
		await clearProxy();
	}

	setInterval(() => watchWithSentry(() => {
		getCurrentState().refreshState?.();
	}), milliSeconds.fromSeconds(1));

	updateLocation();
	updateLogicalLoad();
};
