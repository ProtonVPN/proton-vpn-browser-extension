import {dispatchToBackground} from '../tools/dispatchToBackground';
import {triggerPromise} from '../tools/triggerPromise';
import {getErrorAsString} from '../tools/getErrorMessage';
import {GroupResponder} from '../tools/GroupResponder';
import {StateChange} from '../messaging/MessageType';
import {warn} from '../log/log';
import {readSession} from './readSession';
import {fetchJson, jsonRequest} from '../api';
import {saveSession} from './saveSession';
import type {Session} from './Session';
import {RefreshTokenError} from './RefreshTokenError';

const tokenRequestsGroup = new GroupResponder<
	Session,
	Error | RefreshTokenError | string
>();

export const hasRefreshToken = async (session?: Session): Promise<boolean> => {
	if (!session) {
		session = await readSession();
	}

	return Boolean(session.refreshToken);
};

export const refreshToken = async (session?: Session): Promise<Session> => {
	if (!session) {
		session = await readSession();
	}

	const uid = session.uid;

	if (!uid || !session.refreshToken) {
		throw new RefreshTokenError();
	}

	return tokenRequestsGroup.handle(async () => {
		const now = Date.now();

		try {
			session.expiresAt = now;
			await saveSession(session);
			const auth = await fetchJson<{
				RefreshToken: string;
				AccessToken: string;
			}>(
				'auth/refresh',
				jsonRequest(
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
					},
				),
			);

			const sessionAfterApiCall = await readSession();

			// Modified by something else in the meantime, or emptied by logout
			if (sessionAfterApiCall.expiresAt !== now) {
				return sessionAfterApiCall;
			}

			delete session.expiresAt;
			session.refreshToken = auth.RefreshToken;
			session.accessToken = auth.AccessToken;
			await saveSession(session);

			return session;
		} catch (e) {
			let error = e;
			const nextSession = await readSession();

			// Modified by something else in the meantime, or emptied by logout
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
				error = new RefreshTokenError(getErrorAsString(error));

				// Let the initial error throw, sign-out failure is only logged
				triggerPromise(dispatchToBackground(StateChange.SIGN_OUT));
			}

			throw error;
		}
	});
};
