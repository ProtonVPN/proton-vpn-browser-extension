'use background';
import type {Credentials} from '../../account/credentials/Credentials';
import type {WithIdentifiableRequest} from '../../tools/proxyAuth';
import type {ProxyAuthentication} from '../proxy/ProxyAuthentication';
import type {ConnectionState} from '../ConnectionState';
import {getProxyAuthCredentials} from '../proxy/getProxyAuthCredentials';
import {getCurrentStateIfDefined} from './stateStore';

/** Proxy hosts of every server connected to since the extension started */
const serverHostnames: Record<string, boolean> = {};

export const rememberServerHost = (host: string): void => {
	serverHostnames[host] = true;
};

/** Current proxy host, or one of a server connected to previously */
export const isServerHost = (host: string): boolean =>
	host === getCurrentStateIfDefined()?.data?.server?.proxyHost ||
	!!serverHostnames[host];

/** Same as isServerHost, but also accepts any Proton VPN host */
export const isProxyKnownHost = (host: string): boolean =>
	host === getCurrentStateIfDefined()?.data?.server?.proxyHost ||
	/^(.*\.)?protonvpn(\.net|\.com)(:\d+)?$/.test(host) ||
	!!serverHostnames[host];

export const getAuthCredentials = (
	credentials: Credentials | undefined,
	requestDetails?: WithIdentifiableRequest,
): ProxyAuthentication | undefined =>
	getProxyAuthCredentials(
		(getCurrentStateIfDefined() as ConnectionState).data,
		credentials,
		requestDetails,
	);
