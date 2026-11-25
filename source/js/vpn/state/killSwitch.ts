'use background';
import {Storage, storage} from '../../tools/storage';
import {triggerPromise} from '../../tools/triggerPromise';
import type {ProxyServer} from '../ConnectionState';
import {isKillSwitchEnabled} from '../features/KillSwitch';

/**
 * Kill switch: once the user got protected, a disconnection caused by a
 * failure (sleep, network loss, server down...) must not fall back to direct
 * traffic. Traffic stays on the waiter host dead-end until the user explicitly
 * disconnects or logs out. API and local network stay reachable through the
 * bypass list, so the extension can still reconnect.
 *
 * Persisted in session storage, so it survives a background restart (such as
 * a Chrome service worker restarted during sleep).
 *
 * Only active when the user enabled it in the features panel (off by default).
 */
const killSwitch = storage.item<{value: boolean; server?: ProxyServer}>(
	'killSwitch',
	Storage.SESSION,
);

/** undefined until restored from storage or explicitly set */
let armed: boolean | undefined;

const setArmed = (value: boolean, server?: ProxyServer): void => {
	armed = value;
	triggerPromise(killSwitch.setValue(value, {server}));
};

/** The user got protected (proxy successfully set) by this server */
export const armKillSwitch = (server: ProxyServer): void =>
	setArmed(true, server);

/** Explicit disconnection or logout, the only ways to lift the block */
export const disarmKillSwitch = (): void => setArmed(false);

/** Last server the user was protected by, to reconnect while blocked */
export const getKillSwitchServer = async (): Promise<
	ProxyServer | undefined
> =>
	(await isKillSwitchArmed()) ? (await killSwitch.get())?.server : undefined;

export const isKillSwitchArmed = async (): Promise<boolean> => {
	if (armed === undefined) {
		const stored = !!(await killSwitch.get())?.value;
		// An explicit change made while reading wins over the stored value
		armed ??= stored;
	}

	return armed && (await isKillSwitchEnabled());
};
