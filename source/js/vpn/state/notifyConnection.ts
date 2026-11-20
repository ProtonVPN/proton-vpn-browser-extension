'use background';
import type {ErrorDump, ProxyServer} from '../ConnectionState';
import type {ApiError} from '../../api/ApiError';
import {setButton} from '../../tools/browserAction';
import {notifyStateChange} from '../../tools/notifyStateChange';
import {c} from '../../tools/translate';

/** Show the extension button as protected by the given server */
export const setConnectedButton = (serverName: string | undefined): void => {
	setButton('on', `${c('Label').t`Protected`} - ${serverName || ''}`);
};

/** Tell the UI (popup and extension button) the connection is established */
export const notifyConnected = (
	server: ProxyServer | undefined,
	error: ApiError | Error | ErrorDump | undefined,
): void => {
	notifyStateChange('connected', {server, error});
	setConnectedButton(server?.name);
};

/** Tell the UI (popup and extension button) the connection is in progress */
export const notifyConnecting = (server: ProxyServer | undefined): void => {
	// Keep the variable name: the translation key is "Connecting to ${serverName}"
	const serverName = server?.name || '';
	notifyStateChange('connecting', {server});
	setButton(
		'connecting',
		/* translator: connection in progress to the server, for instance "Connecting to Paris #12" */
		c('Status').t`Connecting to ${serverName}`,
	);
};
