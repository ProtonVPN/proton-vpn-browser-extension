'use popup';
import {watchBroadcastMessages} from '../../tools/answering';
import {milliSeconds} from '../../tools/milliSeconds';
import {
	lastPageNetworkError,
	pageNetworkErrorMessageType,
} from '../../tools/pageNetworkError';
import {triggerPromise} from '../../tools/triggerPromise';

/**
 * Check connectivity when a page failed to load due to a connectivity error,
 * either recently before the popup was opened, or while it is open.
 *
 * @return a function to stop watching.
 */
export const watchPageNetworkErrors = (
	check: () => Promise<void>,
	maxAge = milliSeconds.fromMinutes(2),
	now = Date.now(),
): (() => void) => {
	triggerPromise(
		lastPageNetworkError.get().then((lastError) => {
			if (lastError?.time && now - lastError.time < maxAge) {
				return check();
			}

			return undefined;
		}),
	);

	return watchBroadcastMessages({
		[pageNetworkErrorMessageType]() {
			triggerPromise(check());
		},
	});
};
