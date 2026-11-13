'use background';
import {getCredentials} from '../../account/credentials/getConnectionCredentials';
import {isPending} from '../../tools/proxyAuth';
import type {ConnectionState} from '../ConnectionState';
import type {ProxyAuthentication} from './ProxyAuthentication';
import {getProxyAuthCredentials} from './getProxyAuthCredentials';
import OnAuthRequiredDetails = chrome.webRequest.OnAuthRequiredDetails;

/**
 * Answer to a webRequest.onAuthRequired challenge in the connected state.
 *
 * @param getData Read lazily, the state may change while fetching credentials
 * @param isServerHost Whether the challenger host is one of our proxy servers
 */
export const getProxyAuthentication = async (
	requestDetails: OnAuthRequiredDetails,
	getData: () => ConnectionState['data'],
	isServerHost: (host: string) => boolean,
): Promise<ProxyAuthentication | undefined> => {
	if (!requestDetails.isProxy) {
		return undefined;
	}

	if (isPending(requestDetails)) {
		return {cancel: true};
	}

	if (!isServerHost(requestDetails.challenger.host)) {
		return undefined;
	}

	const credentials = await getCredentials();

	return (
		(credentials &&
			getProxyAuthCredentials(getData(), credentials, requestDetails)) || {
			cancel: true,
		}
	);
};
