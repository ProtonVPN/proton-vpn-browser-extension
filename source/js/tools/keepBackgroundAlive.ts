import {getRuntime} from './getRuntime';
import {milliSeconds} from './milliSeconds';

/**
 * Below the 30 seconds after which an idle background is suspended
 * (Firefox event page: extensions.background.idle.timeout, Chrome service worker).
 */
const keepAliveInterval = milliSeconds.fromSeconds(10);

/**
 * Run the given task, preventing the background from being suspended until
 * it settles.
 *
 * A pending fetch() doesn't count as activity, so a request slower than the
 * idle timeout (bad network) would be cancelled with the background. Calls to
 * APIs implemented by the browser itself reset the idle timer, so call a cheap
 * one regularly.
 */
export const keepBackgroundAliveDuring = async <T>(
	task: () => Promise<T>,
): Promise<T> => {
	const runtime = getRuntime();
	const interval = setInterval(() => {
		runtime.getPlatformInfo?.()?.catch(() => {
			// Only the call matters, not its result
		});
	}, keepAliveInterval);

	try {
		return await task();
	} finally {
		clearInterval(interval);
	}
};
