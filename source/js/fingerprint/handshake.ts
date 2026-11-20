/**
 * Event names for the document_start handshake between the page (MAIN
 * world) script and the isolated world relay: the page script generates a
 * secret per document and gives it to the relay, so later updates (sent by
 * the background to the relay) can't be forged by the page.
 *
 * Both scripts run before any page script, and the listeners are removed
 * once the secret is exchanged, so the page can't take part in it.
 */
export const pageReadyEvent = 'protonvpn-fingerprint-page';
export const relayReadyEvent = 'protonvpn-fingerprint-relay';

/** Message sent by the background to the relay of each frame */
export const fingerprintUpdateMessage = 'fingerprint-update';

export interface FingerprintUpdateMessage {
	type: typeof fingerprintUpdateMessage;
	/** JSON of the new profile, "null" to release */
	profile: string;
}
