import {milliSeconds} from '../tools/milliSeconds';
import {requestMaxAge} from '../config';
import {getAuthCredentials, isProxyKnownHost} from '../state';
import {isPending} from '../tools/proxyAuth';
import {watchPromiseWithSentry, watchWithSentry} from '../tools/sentry';
import {getCredentials} from '../account/credentials/getConnectionCredentials';
import {info} from '../log/log';
import {triggerPromise} from '../tools/triggerPromise';
import WebAuthenticationChallengeDetails = chrome.webRequest.WebAuthenticationChallengeDetails;
import BlockingResponse = chrome.webRequest.BlockingResponse;

const handleProxyAuthentication = async (
	requestDetails: WebAuthenticationChallengeDetails,
): Promise<BlockingResponse> => watchPromiseWithSentry(async () => {
	if (requestDetails.isProxy) {
		if (isPending(requestDetails)) {
			return {cancel: true};
		}

		if (isProxyKnownHost(requestDetails.challenger.host)) {
			info('Auth required for ', requestDetails);
			const credentials = await getCredentials();

			return (credentials && getAuthCredentials(credentials, requestDetails))
				|| {cancel: true};
		}
	}

	return {};
});

export const authHandler = (
	requestDetails: WebAuthenticationChallengeDetails,
	callback?: (response: BlockingResponse) => void,
) => watchWithSentry(() => {
	if (!callback) {
		throw new Error('asyncBlocking not supported');
	}

	const timeout = setTimeout(() => watchWithSentry(() => {
		callback({cancel: true});
	}), milliSeconds.fromSeconds(Math.min(20, requestMaxAge)));

	triggerPromise(handleProxyAuthentication(requestDetails).then(authentication => {
		clearTimeout(timeout);
		callback(
			authentication || (
			requestDetails.isProxy && isProxyKnownHost(requestDetails.challenger.host)
				? {cancel: true}
				: {}
			),
		);
	}));
});
