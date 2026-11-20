import {storage} from '../tools/storage';
import type {Toggle} from '../vpn/features/Toggle';
import type {FingerprintGroup} from './FingerprintGroup';
import {fingerprintGroups, getFingerprintGroupKey} from './FingerprintGroup';

export const storedFingerprintToggles = Object.fromEntries(
	fingerprintGroups.map((group) => [
		group,
		storage.item<Toggle>(getFingerprintGroupKey(group)),
	]),
) as Record<FingerprintGroup, ReturnType<typeof storage.item<Toggle>>>;

/** Set when the user dismissed the suggestion shown once connected */
export const fingerprintSuggestionDismissed = storage.item<{value: number}>(
	'dismissed-fingerprint-suggestion',
);
