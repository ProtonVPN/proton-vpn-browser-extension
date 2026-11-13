'use popup';
import {isNetworkUnreachableError} from '../../api';
import {triggerPromise} from '../../tools/triggerPromise';
import {
	type OfflineStatusWatcherOptions,
	watchOfflineStatus,
} from './watchOfflineStatus';

/**
 * Watch the offline status (see watchOfflineStatus) and filter errors to be
 * displayed: while the offline notice is shown, network errors such as
 * "Network is unreachable" would be redundant and could make the user think
 * the VPN is at fault, so they are hidden, and displayed again if they are
 * still the current error once the device is back online.
 *
 * @param slot Where to display the offline notice
 * @param renderError Actually display (or clear when undefined) an error
 * @return setError to be used instead of renderError
 */
export const watchOfflineStatusAndErrors = <T>(
	slot: HTMLElement | null,
	renderError: (error: T | undefined) => void,
	options: Omit<OfflineStatusWatcherOptions, 'onChange'> = {},
) => {
	let lastError: T | undefined = undefined;
	let offline = false;

	const display = () => {
		renderError(
			offline && isNetworkUnreachableError(lastError) ? undefined : lastError,
		);
	};

	const offlineStatus = watchOfflineStatus(slot, {
		...options,
		onChange: (value) => {
			offline = value;
			display();
		},
	});

	return {
		offlineStatus,
		setError(error: T | undefined) {
			lastError = error;

			// A network error is a good hint the device may have gone offline,
			// check now instead of waiting for the next periodic check
			if (!offline && isNetworkUnreachableError(error)) {
				triggerPromise(offlineStatus.check());
			}

			display();
		},
	};
};
