/**
 * Content script registered in the isolated world at document_start while
 * connected: forwards profile updates from the background (e.g. release on
 * disconnection) to the page script, with the secret it received from it.
 */
import type {FingerprintUpdateMessage} from './fingerprint/handshake';
import {
	fingerprintUpdateMessage,
	pageReadyEvent,
	relayReadyEvent,
} from './fingerprint/handshake';

(() => {
	let secret: string | undefined;

	const onPageReady = (event: Event) => {
		const detail = (event as CustomEvent).detail;

		if (typeof detail === 'string' && !secret) {
			secret = detail;
			window.removeEventListener(pageReadyEvent, onPageReady, true);
			window.dispatchEvent(new CustomEvent(relayReadyEvent, {detail: 'done'}));
		}
	};

	window.addEventListener(pageReadyEvent, onPageReady, true);
	window.dispatchEvent(new CustomEvent(relayReadyEvent));

	chrome.runtime.onMessage.addListener((message: unknown) => {
		const update = message as Partial<FingerprintUpdateMessage> | undefined;

		if (
			secret &&
			update?.type === fingerprintUpdateMessage &&
			typeof update.profile === 'string'
		) {
			window.dispatchEvent(new CustomEvent(secret, {detail: update.profile}));
		}
	});
})();
