import {getCredentials} from '../account/credentials/getConnectionCredentials';
import {disconnect, getCurrentState} from '../state';
import {c} from './translate';
import {ApiError} from '../api';
import {milliSeconds} from './milliSeconds';
import WebResponseCacheDetails = chrome.webRequest.WebResponseCacheDetails;
import ResourceRequest = chrome.webRequest.ResourceRequest;

let authPending = {} as Record<string, true>;
let checkingCredentials = false;
let lastRetry = 0;
let lastTimeout: NodeJS.Timeout | undefined = undefined;

const retryCredentials = (disconnectOnFailure = false) => {
	if (lastTimeout) {
		return;
	}

	lastTimeout = setTimeout(async () => {
		clearTimeout(lastTimeout);
		lastTimeout = undefined;
		lastRetry = Date.now();

		if (checkingCredentials) {
			return;
		}

		checkingCredentials = true;

		try {
			const credentials = await getCredentials();

			if (!credentials) {
				throw new Error(
					c('Error').t`Unable to reach the server, please try to reconnect, or to log out and log in again if the problem persists`,
				);
			}

			await getCurrentState()?.connectCurrentServer?.();
		} catch (e) {
			if (disconnectOnFailure) {
				disconnect(e as Error | ApiError);
			}
		} finally {
			checkingCredentials = false;
		}
	}, Math.max(1, lastRetry + milliSeconds.fromSeconds(20) - Date.now()));
};

export const clearPending = (request: WebResponseCacheDetails): void => {
	if (getCurrentState()?.name !== 'on') {
		return;
	}

	const error = (request as any).error;

	if (error) {
		const shortError = error.replace(/^net::/, '').replace(/^ERR_/, '');

		switch (shortError) {
			// case 'FAILED':
			// case 'ABORTED':
			// case 'BLOCKED_BY_CLIENT':
			// 	break;
			case 'NETWORK_CHANGED':
			case 'NETWORK_IO_SUSPENDED':
				retryCredentials();
				break;

			case 'TUNNEL_CONNECTION_FAILED':
			case 'PROXY_CONNECTION_FAILED':
				retryCredentials(true);
				break;
		}

		return; // auth will be sent again
	}

	if(!authPending[request.requestId]) {
		return;
	}

	delete authPending[request.requestId];
};

export const markAsPending = (request: ResourceRequest) => {
	authPending[request.requestId] = true;
};

export const isPending = (request: ResourceRequest): boolean => !!authPending[request.requestId];
