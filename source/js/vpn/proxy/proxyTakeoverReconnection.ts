'use background';
import type {Timed} from '../../tools/storage';
import {Storage, storage} from '../../tools/storage';
import {triggerPromise} from '../../tools/triggerPromise';
import type {ProxyServer} from '../ConnectionState';

/**
 * Server the user was connected to when another extension took control
 * over the proxy settings, so we can reconnect to it once released.
 *
 * Stored in session storage so it survives a background restart,
 * but not a browser restart.
 */
const serverToReconnect = storage.item<
	Partial<Timed<{value: ProxyServer | undefined}>>
>('proxyTakeoverReconnection', Storage.SESSION);

/** null until loaded from storage */
let cachedServer: ProxyServer | undefined | null = null;

/** Forget the pending reconnection (user connected, disconnected or logged out) */
export const cancelProxyTakeoverReconnection = (): void => {
	if (cachedServer === undefined) {
		return;
	}

	cachedServer = undefined;
	triggerPromise(serverToReconnect.remove());
};

/** Reconnect to this server once proxy control is back */
export const scheduleProxyTakeoverReconnection = (
	server: ProxyServer | undefined,
): void => {
	if (!server) {
		cancelProxyTakeoverReconnection();

		return;
	}

	cachedServer = server;
	triggerPromise(serverToReconnect.setValue(server));
};

/** Server to reconnect to, undefined if no reconnection is pending */
export const getProxyTakeoverReconnectionServer = async (): Promise<
	ProxyServer | undefined
> => {
	if (cachedServer === null) {
		const storedServer = (await serverToReconnect.get())?.value;

		// Schedule or cancel may have happened while loading
		if (cachedServer === null) {
			cachedServer = storedServer;
		}
	}

	return cachedServer;
};
