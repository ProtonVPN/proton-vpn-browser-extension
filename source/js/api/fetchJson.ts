import {readSession} from '../account/readSession';
import {refreshToken} from '../account/refreshToken';
import type {ExtensionUpdate} from '../tools/broadcastMessage';
import {broadcastMessage} from '../tools/broadcastMessage';
import {getUpdateError, setUpdateError} from '../tools/update';
import {warn} from '../log/log';
import type {ApiError, ResponseResult, WithResponse} from './ApiError';
import {
	isInvalidTokenError,
	isObject,
	isSuccessfulResponse,
	needsUpdate,
} from './errorGuards';
import {fetchApi} from './fetchApi';
import {buildResponseResult, getResponseContent} from './responseContent';

/**
 * Refresh the session token and replay the request with it.
 *
 * Return the new response if the token actually changed and the replayed
 * request succeeded, undefined otherwise.
 */
const retryWithRefreshedToken = async (
	url: string,
	init?: RequestInit,
	baseUrl?: string,
): Promise<Response | undefined> => {
	const oldSession = await readSession();
	// Capture before refreshing, as refreshToken() may mutate the session object
	const oldUid = oldSession.uid;
	const oldAccessToken = oldSession.accessToken;
	const newSession = await refreshToken(oldSession);

	if (
		!newSession.uid ||
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
	init?: RequestInit,
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

	const response = await fetchApi(url, init, baseUrl);

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
			const retryResponse = await retryWithRefreshedToken(url, init, baseUrl);

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
