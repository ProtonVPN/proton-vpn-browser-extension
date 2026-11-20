/**
 * Content script registered in the page (MAIN world) at document_start
 * while connected, preceded by the spec token files (see specEncoding.ts).
 */
import {buildProfileFromSpec} from './fingerprint/buildSpoofedProfile';
import {pageReadyEvent, relayReadyEvent} from './fingerprint/handshake';
import {installSpoofing} from './fingerprint/pageSpoofing';
import {decodeSpec, specGlobalName} from './fingerprint/specEncoding';

(() => {
	const root = self as unknown as Record<string, unknown>;
	const tokens = root[specGlobalName];

	// Never leave it visible to the page
	delete root[specGlobalName];

	if (!Array.isArray(tokens)) {
		return;
	}

	const profile = buildProfileFromSpec(
		decodeSpec(tokens as string[]),
		navigator.userAgent,
	);

	if (!profile) {
		return;
	}

	const secret =
		'p' +
		Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
			byte.toString(16).padStart(2, '0'),
		).join('');

	installSpoofing(profile, secret);

	// Give the secret to the relay, whichever of both scripts runs first:
	// announce now (relay already listening) and again when the relay says
	// it's ready (relay not yet listening). The relay acknowledges with
	// "done" once it got the secret, so this listener never lingers
	// (else the page could later ask for the secret).
	const announce = () => {
		window.dispatchEvent(new CustomEvent(pageReadyEvent, {detail: secret}));
	};
	const onRelayReady = (event: Event) => {
		window.removeEventListener(relayReadyEvent, onRelayReady, true);

		if ((event as CustomEvent).detail !== 'done') {
			announce();
		}
	};
	window.addEventListener(relayReadyEvent, onRelayReady, true);
	announce();
})();
