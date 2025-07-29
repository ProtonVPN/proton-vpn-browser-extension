import {milliSeconds} from '../tools/milliSeconds';
import {requestMaxAge} from '../config';
import {getAuthCredentials, isProxyKnownHost} from '../state';
import {isPending} from '../tools/proxyAuth';
import {watchPromiseWithSentry, watchWithSentry} from '../tools/sentry';
import {getCredentials} from '../account/credentials/getConnectionCredentials';
import {bind, info as info_} from '../log/log';
import {triggerPromise} from '../tools/triggerPromise';
import BlockingResponse = chrome.webRequest.BlockingResponse;
import OnAuthRequiredDetails = chrome.webRequest.OnAuthRequiredDetails;

const info = bind(info_, '[authHandler]');

const handleProxyAuthentication = async (
	requestDetails: OnAuthRequiredDetails,
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
	requestDetails: OnAuthRequiredDetails,
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

	return undefined; // not BlockingResponse
});
