import {Storage, storage} from './storage';
import type {BroadcastMessage} from './broadcastMessage';

/**
 * webRequest.onErrorOccurred `error` values meaning the network could not be
 * reached at all (as opposed to e.g. a refused connection, a certificate
 * issue or a blocked request, which prove the network works).
 *
 * - Chrome: net::ERR_* from net/base/net_error_list.h
 * - Firefox: XPCOM error names from xpcom/base/ErrorList.py
 *
 * While the VPN is connected, the device being offline and the proxy being
 * unreachable give the same error (e.g. net::ERR_PROXY_CONNECTION_FAILED),
 * so this is only used as a hint to run probeConnectivity, never as a
 * conclusion by itself.
 */
const connectivityErrors = new Set([
	// Chrome
	'net::ERR_INTERNET_DISCONNECTED',
	'net::ERR_NAME_NOT_RESOLVED',
	'net::ERR_NAME_RESOLUTION_FAILED',
	'net::ERR_DNS_TIMED_OUT',
	'net::ERR_ADDRESS_UNREACHABLE',
	'net::ERR_CONNECTION_TIMED_OUT',
	'net::ERR_TIMED_OUT',
	'net::ERR_CONNECTION_FAILED',
	'net::ERR_NETWORK_CHANGED',
	'net::ERR_PROXY_CONNECTION_FAILED',
	'net::ERR_TUNNEL_CONNECTION_FAILED',
	// Firefox
	'NS_ERROR_OFFLINE',
	'NS_ERROR_UNKNOWN_HOST',
	'NS_ERROR_UNKNOWN_PROXY_HOST',
	'NS_ERROR_NET_TIMEOUT',
	'NS_ERROR_NET_TIMEOUT_EXTERNAL',
	'NS_ERROR_PROXY_CONNECTION_REFUSED',
]);

export const isConnectivityError = (error: string | undefined): boolean =>
	!!error && connectivityErrors.has(error);

/** When a page last failed to load due to a connectivity error */
export const lastPageNetworkError = storage.item<{time: number}>(
	'last-page-network-error',
	Storage.SESSION,
	'time',
);

export const pageNetworkErrorMessageType = 'pageNetworkError';

export type PageNetworkErrorMessage = BroadcastMessage<
	typeof pageNetworkErrorMessageType,
	undefined
>;
