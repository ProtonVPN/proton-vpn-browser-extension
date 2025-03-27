import {isCurrentStateConnected} from '../state';
import {ErrorCode, getErrorCode} from './getErrorCode';
import {retryCredentials} from './retryCredentials';
import WebResponseCacheDetails = chrome.webRequest.WebResponseCacheDetails;
import ResourceRequest = chrome.webRequest.ResourceRequest;

let authPending = {} as Record<string, true>;

export const clearPending = (request: WebResponseCacheDetails): void => {
	if (!isCurrentStateConnected()) {
		return;
	}

	const error = (request as any).error;

	if (error) {
		switch (getErrorCode(error)) {
			case ErrorCode.NETWORK_CHANGED:
			case ErrorCode.NETWORK_IO_SUSPENDED:
				retryCredentials();
				break;

			case ErrorCode.TUNNEL_CONNECTION_FAILED:
			case ErrorCode.PROXY_CONNECTION_FAILED:
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
