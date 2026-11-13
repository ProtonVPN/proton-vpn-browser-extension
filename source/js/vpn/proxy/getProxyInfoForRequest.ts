'use background';
/// <reference types="firefox-webext-browser"/>
import {
	excludeApiFromProxy,
	proxyLocalNetworkExclusion,
	scheme,
} from '../../config';
import {isExcludedFromProxy, isIncludedIntoProxy} from '../../api';
import type {Credentials} from '../../account/credentials/Credentials';
import {
	getCredentials,
	getSynchronousCredentials,
} from '../../account/credentials/getConnectionCredentials';
import {readSession} from '../../account/readSession';
import {delay} from '../../tools/delay';
import {getBypassList} from '../getBypassList';
import {getIncludeOnlyList} from '../getIncludeOnlyList';
import {getBasicAuth} from '../getBasicAuth';
import type {ConnectionState, SplitTunnelingConfig} from '../ConnectionState';
import {SplitTunnelingMode} from '../WebsiteFilter';
import type {ProxyInfo} from './ProxyInfo';
import {getProxyAuthCredentials} from './getProxyAuthCredentials';
import {warn} from '../../log/log';
import OnRequestDetails = browser.proxy._OnRequestDetails;

/**
 * Whether the request must skip the proxy according to split tunneling.
 *
 * An exception (such as a malformed filter entry) must never escape the
 * proxy.onRequest handler. On error, Exclude mode fails closed (the request
 * goes through the proxy) and Include mode fails open (the request goes direct,
 * like any domain absent from the include list).
 */
const shouldBypassProxy = (
	requestDetails: OnRequestDetails,
	splitTunneling: SplitTunnelingConfig | undefined,
): boolean => {
	try {
		// This is only to avoid proxy for localhost, but we might actually want to access the API via the proxy in normal cases
		// We should extend this to prevent proxying for LAN addresses
		const bypassList = [
			...proxyLocalNetworkExclusion,
			...getBypassList(splitTunneling),
		];

		if (isExcludedFromProxy(requestDetails, excludeApiFromProxy, bypassList)) {
			return true;
		}

		return !isIncludedIntoProxy(
			requestDetails,
			excludeApiFromProxy,
			getIncludeOnlyList(splitTunneling),
		);
	} catch (error) {
		const isIncludeMode = splitTunneling?.mode === SplitTunnelingMode.Include;
		warn(
			`Split tunneling routing failed, ${isIncludeMode ? 'bypassing' : 'using'} proxy`,
			error,
		);

		return isIncludeMode;
	}
};

/**
 * Firefox proxy.onRequest routing for the connected state.
 *
 * @param getData Read lazily, credentials may resolve after the state changed
 * @param onCredentialsFailure Called when no credentials could be obtained
 *                             after retries, with whether there is a session
 */
export const getProxyInfoForRequest = (
	requestDetails: OnRequestDetails,
	getData: () => ConnectionState['data'],
	onCredentialsFailure: (hasSession: boolean) => void,
): ProxyInfo | null | Promise<ProxyInfo> => {
	// null rather than {type: 'direct'} which Firefox replaces with the
	// proxy.settings value (the waiter host dead-end) when there is one
	if (shouldBypassProxy(requestDetails, getData()?.server?.splitTunneling)) {
		return null;
	}

	const formatOutput = (newCredentials: Credentials | undefined) => {
		const data = getData();
		const config = {
			type: scheme,
			host: data?.server?.proxyHost,
			port: data?.server?.proxyPort,
			...getProxyAuthCredentials(data, newCredentials, requestDetails)
				?.authCredentials,
		} as ProxyInfo;

		if (config.username && config.password) {
			config.proxyAuthorizationHeader = getBasicAuth(
				config.username,
				config.password,
			);
		}

		return config;
	};
	const cachedCredentials = getSynchronousCredentials();

	if (cachedCredentials) {
		return formatOutput(cachedCredentials);
	}

	const tryCredentials = (retry: number): Promise<ProxyInfo> =>
		getCredentials(true).then((credentials) => {
			if (credentials) {
				return formatOutput(credentials);
			}

			return readSession().then((session) => {
				if (retry > 0) {
					return delay(400).then(() => tryCredentials(retry - 1));
				}

				onCredentialsFailure(!!session?.uid);

				// Intentionally not null: Firefox replaces {type: 'direct'} with the
				// proxy.settings waiter host dead-end, so this request fails closed
				// instead of leaking while disconnecting. Do not "align" with the
				// null returns used for deliberate bypasses above.
				return {type: 'direct'};
			});
		});

	return tryCredentials(3);
};
