import {readSession} from '../account/readSession';
import {RefreshTokenError} from '../account/RefreshTokenError';
import {getRefreshTokenFingerprint} from '../account/refreshTokenFingerprint';
import type {Session} from '../account/Session';
import {dispatchToBackground} from '../tools/dispatchToBackground';
import {
	BackgroundAction,
	type RefreshTokenData,
} from '../messaging/MessageType';
import {isObject} from '../tools/isObject';
import type {ExtensionUpdate} from '../tools/broadcastMessage';
import {broadcastMessage} from '../tools/broadcastMessage';
import {getUpdateError, setUpdateError} from '../tools/update';
import {warn} from '../log/log';
import type {ApiError, ResponseResult, WithResponse} from './ApiError';
import {
	isInvalidTokenError,
	isSuccessfulResponse,
	needsUpdate,
} from './errorGuards';
import {
	type ApiRequestInit,
	fetchApi,
	readSessionOnceRefreshed,
} from './fetchApi';
import {buildResponseResult, getResponseContent} from './responseContent';

/**
 * Have the background refresh the session token, and replay the request with
 * the new one.
 *
 * The background is the only context refreshing tokens: the popup can be
 * closed at any time, which would lose tokens rotated by the API but not
 * saved yet.
 *
 * usedSession is the session the rejected request was sent with: if the
 * tokens were rotated since (e.g. by another refresh which completed while
 * this request was in flight), the background doesn't refresh them again.
 *
 * Return the new response if the token actually changed and the replayed
 * request succeeded, undefined otherwise.
 */
const retryWithRefreshedToken = async (
	url: string,
	init: ApiRequestInit | undefined,
	baseUrl: string | undefined,
	usedSession: Session | undefined,
): Promise<Response | undefined> => {
	const oldSession = usedSession || (await readSession());
	const oldUid = oldSession.uid;
	const oldAccessToken = oldSession.accessToken;
	const usedRefreshToken = oldSession.refreshToken;

	if (!oldUid || !usedRefreshToken) {
		throw new RefreshTokenError();
	}

	await dispatchToBackground(BackgroundAction.REFRESH_TOKEN, {
		refreshTokenFingerprint: await getRefreshTokenFingerprint(usedRefreshToken),
	} satisfies RefreshTokenData);

	const newSession = await readSession();

	if (
		!newSession?.uid ||
		!newSession.accessToken ||
		(newSession.uid === oldUid && newSession.accessToken === oldAccessToken)
	) {
		return undefined;
	}

	const retryResponse = await fetchApi(url, init, baseUrl, newSession);

	return isSuccessfulResponse(retryResponse) ? retryResponse : undefined;
};

export const fetchJson = async <T, D extends ResponseResult = ResponseResult>(
	url: string,
	init?: ApiRequestInit,
	baseUrl?: string,
	resultBuilder?: (response: Response, data: D) => T,
): Promise<T> => {
	const upgradeError = await getUpdateError();

	// If we have a recent force-upgrade, useless to call API
	if (upgradeError) {
		broadcastMessage<ExtensionUpdate>('updateExtension', {
			error: upgradeError,
		});

		throw upgradeError;
	}

	const usedSession = (init?.headers as Record<string, string> | undefined)?.[
		'x-pm-uid'
	]
		? undefined
		: await readSessionOnceRefreshed();
	const response = await fetchApi(url, init, baseUrl, usedSession);

	if (!isSuccessfulResponse(response)) {
		const data = (await getResponseContent(response)) as unknown;
		const error = (data as ApiError)?.Error ? data : new Error(data as string);
		(error as WithResponse).response = response;

		if (isObject(error)) {
			(error as {httpStatus?: number}).httpStatus = response.status;
		}

		if (needsUpdate(data)) {
			broadcastMessage<ExtensionUpdate>('updateExtension', {
				error: error as ApiError,
			});
			setUpdateError(data);

			throw error;
		}

		setUpdateError(undefined);

		if (!/\/?auth(\/.*)$/.test(url) && isInvalidTokenError(error)) {
			const retryResponse = await retryWithRefreshedToken(
				url,
				init,
				baseUrl,
				usedSession,
			);

			if (retryResponse) {
				return buildResponseResult<T, D>(retryResponse, resultBuilder);
			}

			warn(error);
		}

		throw error;
	}

	setUpdateError(undefined);

	return buildResponseResult<T, D>(response, resultBuilder);
};
