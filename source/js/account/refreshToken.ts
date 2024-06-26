import {readSession} from './readSession';
import {fetchJson, jsonRequest} from '../api';
import {saveSession} from './saveSession';
import {Session} from './Session';
import {sendMessageToBackground} from '../tools/sendMessageToBackground';
import {StateChange} from '../messaging/MessageType';
import {triggerPromise} from '../tools/triggerPromise';
import {warn} from '../log/log';
import {RefreshTokenError} from './RefreshTokenError';
import {getErrorAsString} from '../tools/getErrorMessage';

let refreshing = false;
let waitingRefreshPromises = [] as ([
	(session: Session) => void,
	(error: Error | RefreshTokenError | string) => void,
])[];

export const refreshToken = async (session?: Session): Promise<Session> => {
	if (!session) {
		session = await readSession();
	}

	if (!session.uid || !session.refreshToken) {
		throw new RefreshTokenError();
	}

	if (refreshing) {
		return await new Promise((resolve, reject) => {
			waitingRefreshPromises.push([resolve, reject]);
		});
	}

	try {
		refreshing = true;
		session.expiresAt = Date.now();
		await saveSession(session);
		const auth = await fetchJson<{
			RefreshToken: string;
			AccessToken: string;
		}>('auth/refresh', jsonRequest(
			'POST',
			{
				UID: session.uid,
				ResponseType: 'token',
				GrantType: 'refresh_token',
				RefreshToken: session.refreshToken,
				RedirectURI: session.redirectURI || 'https://protonvpn.com',
			},
			{
				'x-pm-uid': session.uid,
			},
		));
		delete session.expiresAt;
		session.refreshToken = auth.RefreshToken;
		session.accessToken = auth.AccessToken;
		await saveSession(session);

		waitingRefreshPromises.forEach(([resolve]) => {
			resolve(session as Session);
		});
		waitingRefreshPromises = [];

		return session;
	} catch (e) {
		const nextSession = await readSession();

		if (nextSession.expiresAt && nextSession.accessToken === session.accessToken) {
			delete nextSession.expiresAt;
			await saveSession(nextSession);
		}

		if ((e as any).Code === 10013) {
			warn(e, new Error().stack);
			e = new RefreshTokenError(getErrorAsString(e));

			try {
				triggerPromise(sendMessageToBackground(StateChange.SIGN_OUT));
			} catch (e) {
				// Let the initial error throw
			}

			waitingRefreshPromises.forEach(([, reject]) => {
				reject(e as RefreshTokenError);
			});
			waitingRefreshPromises = [];
		}

		throw e;
	} finally {
		refreshing = false;
	}
};
