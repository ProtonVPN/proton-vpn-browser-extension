'use background';
import {authCheck} from '../../config';
import type {Credentials} from '../../account/credentials/Credentials';
import type {WithIdentifiableRequest} from '../../tools/proxyAuth';
import {markAsPending} from '../../tools/proxyAuth';
import {bind, warn as warn_} from '../../log/log';
import type {ConnectionState} from '../ConnectionState';
import type {ProxyAuthentication} from './ProxyAuthentication';

const warn = bind(warn_, '[state]');

/** Do not try the same credentials more than this */
const maxTries = 10;

/**
 * Credentials to answer a proxy authentication challenge with.
 *
 * Records the given credentials (and the number of tries with them)
 * into the connection state data, so it gives up after too many
 * consecutive failures with the same credentials.
 */
export const getProxyAuthCredentials = (
	data: ConnectionState['data'],
	credentials: Credentials | undefined,
	requestDetails?: WithIdentifiableRequest,
): ProxyAuthentication | undefined => {
	if (
		credentials &&
		(data.credsData?.Username !== credentials.Username ||
			data.credsData?.Password !== credentials.Password)
	) {
		Object.assign(data, {
			credsTry: 0,
			credsData: credentials,
		});
	}

	if (!data.credsData) {
		return undefined;
	}

	const authCredentials = {
		username: data.credsData.Username,
		password: data.credsData.Password,
	};

	if (!authCheck) {
		return {authCredentials};
	}

	data.credsTry = (data.credsTry || 0) + 1;

	if (data.credsTry < maxTries) {
		if (requestDetails) {
			markAsPending(requestDetails);
		}

		return {authCredentials};
	}

	warn(data.credsTry + ' consecutive failures');

	return undefined;
};
