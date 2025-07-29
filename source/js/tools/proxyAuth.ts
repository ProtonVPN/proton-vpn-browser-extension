import {isCurrentStateConnected} from '../state';
import {ErrorCode, getErrorCode} from './getErrorCode';
import {retryCredentials} from './retryCredentials';
import CreateResponseDetails = chrome.webAuthenticationProxy.CreateResponseDetails;
import OnErrorOccurredDetails = chrome.webRequest.OnErrorOccurredDetails;
import OnCompletedDetails = chrome.webRequest.OnCompletedDetails;

let authPending = {} as Record<string, true>;

export interface WithIdentifiableRequest {
	requestId: string|number;
}

export const clearPending = (request: CreateResponseDetails|OnCompletedDetails|OnErrorOccurredDetails): void => {
	if (!isCurrentStateConnected()) {
		return;
	}

	const error = (request as CreateResponseDetails).error;

	if (error) {
		switch (getErrorCode(error as any)) {
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

export const markAsPending = ({requestId}: WithIdentifiableRequest) => {
	authPending[requestId] = true;
};

export const isPending = ({requestId}: WithIdentifiableRequest): boolean => !!authPending[requestId];
