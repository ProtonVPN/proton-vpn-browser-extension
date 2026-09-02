/**
 * Forward the messages posted on the given window to the extension runtime.
 *
 * Used by the content script injected in the Proton account pages, so what
 * those pages post reaches the background script.
 */
export const relayMessagesToExtension = (
	source: Window,
	runtime: typeof browser.runtime,
): void => {
	runtime.connect();

	source.addEventListener(
		'message',
		(event) => {
			if (event.source !== source) {
				return;
			}

			runtime.sendMessage(event.data);
		},
		false,
	);
};
