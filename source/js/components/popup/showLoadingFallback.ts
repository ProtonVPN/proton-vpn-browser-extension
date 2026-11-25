'use popup';
import {milliSeconds} from '../../tools/milliSeconds';
import {timeoutAfter} from '../../tools/delay';
import {sendMessageToBackground} from '../../tools/sendMessageToBackground';
import {StateChange} from '../../messaging/MessageType';

/**
 * When the background is stuck (e.g. after the computer wakes up), loading can
 * take a while: explain it, then offer a way out so the user can get internet
 * back. Hidden with the spinner once the popup is loaded.
 */
export const showLoadingFallback = (area: HTMLElement): void => {
	const spinner = area.querySelector<HTMLElement>('#spinner');

	if (!spinner) {
		return;
	}

	setTimeout(() => spinner.classList.add('slow'), milliSeconds.fromSeconds(3));
	setTimeout(
		() => spinner.classList.add('stuck'),
		milliSeconds.fromSeconds(10),
	);

	spinner
		.querySelector('.spinner-disconnect-button')
		?.addEventListener('click', () => {
			// Chrome applies proxy settings on its own, clear them directly in case
			// the background does not answer. Firefox routes each request through
			// proxy.onRequest in the background, the message below handles it.
			if (!(chrome.proxy as {onRequest?: unknown} | undefined)?.onRequest) {
				chrome.proxy?.settings.clear({});
			}

			timeoutAfter(
				sendMessageToBackground(StateChange.DISCONNECT),
				milliSeconds.fromSeconds(2),
			)
				.catch(() => {
					// Background unreachable, nothing more we can do from here
				})
				.finally(() => window.close());
		});
};
