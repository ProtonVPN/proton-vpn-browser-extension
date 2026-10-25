'use background';
import {setSimulateHangingApi} from '../api';
import {getGlobalBrowser} from './getGlobalBrowser';
import {milliSeconds} from './milliSeconds';
import {triggerPromise} from './triggerPromise';

/**
 * Console commands to reproduce bugs, only for unpacked (Chrome) or temporary (Firefox) installs.
 * Run them from the background console (service worker inspector / about:debugging).
 */
export const initDevCommands = () => {
	triggerPromise(
		(async () => {
			const self = await getGlobalBrowser().management?.getSelf?.();

			if (self?.installType !== 'development') {
				return;
			}

			const realNow = Date.now;
			let timeOffset = 0;

			(globalThis as any).protonVpnDev = {
				/** Jump time forward (expiring credentials, tokens and caches) and make API requests hang until timeout. */
				simulateSleep(minutes = 30) {
					timeOffset += milliSeconds.fromMinutes(minutes);
					Date.now = () => realNow() + timeOffset;
					setSimulateHangingApi(true);

					return `Slept ${minutes} min, API requests now hang until timeout. Run protonVpnDev.wake() to restore network.`;
				},
				/**
				 * Restore normal API requests and the real clock: after a real sleep, local and server
				 * clocks agree, and credentials carry a server-side absolute expiration.
				 */
				wake() {
					timeOffset = 0;
					Date.now = realNow;
					setSimulateHangingApi(false);

					return 'API requests back to normal.';
				},
			};
		})(),
	);
};
