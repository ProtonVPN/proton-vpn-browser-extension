'use background';
import {Storage, storage} from '../../tools/storage';
import {triggerPromise} from '../../tools/triggerPromise';

/**
 * Kill switch: once the user got protected, a disconnection caused by a
 * failure (sleep, network loss, server down...) must not fall back to direct
 * traffic. Traffic stays on the waiter host dead-end until the user explicitly
 * disconnects or logs out. API and local network stay reachable through the
 * bypass list, so the extension can still reconnect.
 *
 * Persisted in session storage, so it survives a background restart (such as
 * a Chrome service worker restarted during sleep).
 */
const killSwitch = storage.item<{value: boolean}>(
	'killSwitch',
	Storage.SESSION,
);

/** undefined until restored from storage or explicitly set */
let armed: boolean | undefined;

const setArmed = (value: boolean): void => {
	armed = value;
	triggerPromise(killSwitch.setValue(value));
};

/** The user got protected (proxy successfully set) */
export const armKillSwitch = (): void => setArmed(true);

/** Explicit disconnection or logout, the only ways to lift the block */
export const disarmKillSwitch = (): void => setArmed(false);

export const isKillSwitchArmed = async (): Promise<boolean> => {
	if (armed === undefined) {
		const stored = !!(await killSwitch.get())?.value;
		// An explicit change made while reading wins over the stored value
		armed ??= stored;
	}

	return armed;
};
