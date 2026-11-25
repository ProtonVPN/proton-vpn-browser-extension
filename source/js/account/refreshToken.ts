'use background';
import {dispatchToBackground} from '../tools/dispatchToBackground';
import {triggerPromise} from '../tools/triggerPromise';
import {getErrorAsString} from '../tools/getErrorMessage';
import {GroupResponder} from '../tools/GroupResponder';
import {StateChange} from '../messaging/MessageType';
import {warn} from '../log/log';
import {handleError} from '../tools/sentry';
import {readSession} from './readSession';
import {fetchJson} from '../api/fetchJson';
import {jsonRequest} from '../api/fetchApi';
import {getPriorityHeaders, RequestPriority} from '../api/RequestPriority';
import {saveSession} from './saveSession';
import type {Session} from './Session';
import {RefreshTokenError} from './RefreshTokenError';
import {getRefreshTokenFingerprint} from './refreshTokenFingerprint';
import {keepBackgroundAliveDuring} from '../tools/keepBackgroundAlive';

const tokenRequestsGroup = new GroupResponder<
	Session,
	Error | RefreshTokenError | string
>();

// Diagnostic data for invalid refresh token sign-outs
const contextStartedAt = Date.now();
let lastRefreshAt: number | undefined;

export const hasRefreshToken = async (session?: Session): Promise<boolean> => {
	if (!session) {
		session = await readSession();
	}

	return Boolean(session.refreshToken);
};

/**
 * Report to Sentry (if crash reports are enabled) with data that helps
 * finding why the refresh token was rejected:
 * - very recent last refresh: likely a race between 2 refreshes
 * - very young context: likely an outdated session loaded on browser start
 */
const reportInvalidRefreshTokenSignOut = (
	error: unknown,
	session: Session,
	now: number,
) => {
	handleError(
		new Error('Signed out after refresh token rejection'),
		undefined,
		{
			tags: {signOut: 'invalidRefreshToken'},
			extra: {
				apiError: getErrorAsString(error),
				httpStatus: (error as {httpStatus?: number}).httpStatus,
				persistentSession: Boolean(session.persistent),
				contextAgeMs: now - contextStartedAt,
				msSinceLastRefreshInContext:
					lastRefreshAt === undefined ? null : now - lastRefreshAt,
			},
		},
	);
};

/**
 * Get new tokens from the API and save them.
 *
 * The API keeps the previous refresh token valid until the new tokens are
 * used: if the response is lost (network failure, background suspended...),
 * the refresh can safely be sent again with the same refresh token.
 */
export const refreshToken = async (
	callerSession?: Session,
): Promise<Session> => {
	callerSession ||= await readSession();

	const uid = callerSession.uid;
	const usedRefreshToken = callerSession.refreshToken;

	if (!uid || !usedRefreshToken) {
		throw new RefreshTokenError();
	}

	const isStillUsing = (storedSession: Session) =>
		storedSession.uid === uid &&
		storedSession.refreshToken === usedRefreshToken;

	return tokenRequestsGroup.handle(async () => {
		// The caller's session may be outdated: another refresh may have rotated
		// the tokens (or a logout emptied the session) since it was read.
		// Never send nor save an outdated session, as it would overwrite
		// the fresh tokens and use a refresh token the API rejects once the new
		// tokens are used.
		const session = await readSession();

		if (!isStillUsing(session)) {
			return session;
		}

		const now = Date.now();

		try {
			session.expiresAt = now;
			await saveSession(session);
			const auth = await keepBackgroundAliveDuring(() =>
				fetchJson<{
					RefreshToken: string;
					AccessToken: string;
				}>('auth/refresh', {
					...jsonRequest(
						'POST',
						{
							UID: uid,
							ResponseType: 'token',
							GrantType: 'refresh_token',
							RefreshToken: session.refreshToken,
							RedirectURI: session.redirectURI || 'https://protonvpn.com',
						},
						{
							'x-pm-uid': uid,
							// Every other authenticated request waits for this one
							...getPriorityHeaders(RequestPriority.INTERACTIVE),
						},
					),
					// Safe to replay, see refreshToken() doc
					retryOnNetworkError: true,
				}),
			);

			const sessionAfterApiCall = await readSession();

			// Emptied by logout, or tokens rotated by something else in the meantime
			if (!isStillUsing(sessionAfterApiCall)) {
				return sessionAfterApiCall;
			}

			// Save the rotated tokens even if a refresh marker of another refresh
			// replaced ours in the meantime: both got valid tokens from the same
			// refresh token, the first ones to be used invalidate the others.
			delete sessionAfterApiCall.expiresAt;
			sessionAfterApiCall.refreshToken = auth.RefreshToken;
			sessionAfterApiCall.accessToken = auth.AccessToken;
			await saveSession(sessionAfterApiCall);
			lastRefreshAt = Date.now();

			return sessionAfterApiCall;
		} catch (e) {
			let error = e;
			const nextSession = await readSession();

			// Emptied by logout, or tokens rotated by something else in the meantime
			// (that's likely why the refresh token we sent got rejected)
			if (!isStillUsing(nextSession)) {
				return nextSession;
			}

			// Another refresh is in progress
			if (nextSession.expiresAt !== now) {
				return nextSession;
			}

			if (
				nextSession.expiresAt &&
				nextSession.accessToken === session.accessToken
			) {
				delete nextSession.expiresAt;
				await saveSession(nextSession);
			}

			if ((error as {Code: number}).Code === 10013) {
				warn(error, new Error().stack);
				reportInvalidRefreshTokenSignOut(error, session, now);
				error = new RefreshTokenError(getErrorAsString(error));

				// Let the initial error throw, expiration failure is only logged.
				triggerPromise(
					(async () =>
						dispatchToBackground(StateChange.SESSION_EXPIRED, {
							refreshTokenFingerprint:
								await getRefreshTokenFingerprint(usedRefreshToken),
						}))(),
				);
			}

			throw error;
		}
	});
};

/**
 * Refresh the stored session if it still uses the refresh token with the
 * given fingerprint. Otherwise, tokens were already rotated (or the session
 * emptied) since the caller read them, so there is nothing to refresh.
 */
export const refreshTokenByFingerprint = async (
	fingerprint: string | undefined,
): Promise<void> => {
	const session = await readSession();

	if (
		fingerprint &&
		session?.refreshToken &&
		(await getRefreshTokenFingerprint(session.refreshToken)) === fingerprint
	) {
		await refreshToken(session);
	}
};

/**
 * Resolve once the token refresh in progress (if any) completes or fails.
 */
export const waitForRefresh = (): Promise<void> =>
	tokenRequestsGroup.whenSettled();
