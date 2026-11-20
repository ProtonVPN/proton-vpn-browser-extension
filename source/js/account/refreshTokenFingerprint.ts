import {readSession} from './readSession';

/**
 * Short non-reversible identifier of a refresh token, so that messages
 * can refer to a refresh token without carrying it.
 */
export const getRefreshTokenFingerprint = async (
	refreshToken: string,
): Promise<string> => {
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(refreshToken),
	);

	return Array.from(new Uint8Array(digest).slice(0, 16), (byte) =>
		byte.toString(16).padStart(2, '0'),
	).join('');
};

/**
 * Whether the stored session still uses the refresh token with the given
 * fingerprint, or has no refresh token at all (so it is unusable anyway).
 *
 * Without fingerprint, nothing can be compared, so assume it does.
 */
export const isSessionStillUsingRefreshToken = async (
	fingerprint: string | undefined,
): Promise<boolean> => {
	if (!fingerprint) {
		return true;
	}

	const refreshToken = (await readSession())?.refreshToken;

	return (
		!refreshToken ||
		(await getRefreshTokenFingerprint(refreshToken)) === fingerprint
	);
};
