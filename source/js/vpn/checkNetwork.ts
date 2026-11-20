'use background';
import type {ApiError} from '../api/ApiError';
import {isNetworkError} from '../api/errorGuards';
import {setButton} from '../tools/browserAction';
import {c} from '../tools/translate';
import {getCurrentState} from './state/bootstrap';
import {broadcastMessage} from '../tools/broadcastMessage';
import {warn} from '../log/log';
import {handleError} from '../tools/sentry';

export const checkNetwork = (error: unknown, rethrow = false): void => {
	if (isNetworkError(error)) {
		warn(error);
		const currentState = getCurrentState();

		if ((currentState.data.error as ApiError)?.Code !== -1) {
			setButton('warning');
			currentState.data.error = {
				httpStatus: -1,
				Code: -1,
				Warning: true,
				Error: c('Error').t`Network is unreachable`,
			};
			currentState.refreshState?.();
			const server = currentState.data.server;

			broadcastMessage('changeState', {
				state: server ? 'connected' : 'disconnected',
				server,
				error: currentState.data.error,
			});
		}

		if (rethrow) {
			throw error;
		}
	}

	handleError(error);
};
