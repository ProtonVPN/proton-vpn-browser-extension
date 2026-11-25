import {baseAPIURL, getFullAppVersion} from '../config';
import {readSession} from '../account/readSession';
import {getAuthHeaders} from '../account/getAuthHeaders';
import type {Session} from '../account/Session';
import {getRegisteredLocale} from '../account/user/getRegisteredLocale';
import {getLocale} from '../tools/locale';
import {milliSeconds} from '../tools/milliSeconds';
import {delay} from '../tools/delay';
import {dispatchToBackground} from '../tools/dispatchToBackground';
import {BackgroundAction} from '../messaging/MessageType';
import {warn} from '../log/log';
import {getBrowserSubType} from '../tools/getBrowserSubType';
import {isNetworkError, isRetriableResponse} from './errorGuards';
import {getRoute, getThrottledResponse, rememberRetryAfter} from './retryAfter';
import {
	getPriorityHeaders,
	priorityHeaderName,
	RequestPriority,
} from './RequestPriority';

export const jsonRequest = (
	method: string,
	body: unknown,
	headers: Record<string, string> = {},
) => ({
	method,
	headers: {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		...headers,
	},
	body: JSON.stringify(body),
});

/**
 * Add the authentication and locale headers of the given session (if it has
 * credentials) into the given headers object.
 */
const addSessionHeaders = async (
	headers: Record<string, string>,
	session: Session,
): Promise<void> => {
	const uid = session?.uid;
	const accessToken = session?.accessToken;

	if (uid && accessToken) {
		Object.assign(headers, getAuthHeaders(uid, accessToken));
		headers['x-pm-locale'] ??= (await getRegisteredLocale()) || getLocale();
	}
};

/**
 * How long to wait for a token refresh in progress (see refreshToken()).
 * A refresh marker older than that is considered a leftover (e.g. from a
 * service worker stopped mid-refresh) and is ignored.
 */
const refreshWaitLimit = milliSeconds.fromSeconds(8);

const isRefreshInProgress = (session: Session | undefined): boolean =>
	typeof session?.expiresAt === 'number' &&
	Date.now() - session.expiresAt < refreshWaitLimit;

/**
 * Read the stored session, waiting (up to refreshWaitLimit) for a token
 * refresh in progress to complete. So that the request uses the new tokens
 * instead of the old ones (or no auth at all), which would fail with 401.
 *
 * Only the background refreshes tokens, and it knows (in memory) if a refresh
 * is actually in progress. The stored marker only avoids asking it when
 * there is obviously none.
 */
export const readSessionOnceRefreshed = async (): Promise<Session> => {
	const session = await readSession();

	if (!isRefreshInProgress(session)) {
		return session;
	}

	await Promise.race([
		dispatchToBackground(BackgroundAction.WAIT_FOR_REFRESH).catch(warn),
		delay(refreshWaitLimit),
	]);

	return await readSession();
};

export type ApiRequestInit = RequestInit & {
	/**
	 * Retry if the request fails on network level (see fetchWithNetworkRetries).
	 * Default: only for methods which can safely be sent again (GET, HEAD,
	 * DELETE), set it to true for other requests the API handles safely when
	 * replayed (e.g. auth/refresh), false to fail fast.
	 */
	retryOnNetworkError?: boolean;
};

/** Delays before each retry of a request failing on network level */
const networkRetryDelays = [
	milliSeconds.fromSeconds(1),
	milliSeconds.fromSeconds(3),
];

const idempotentMethods = ['GET', 'HEAD', 'DELETE'];

const isOffline = () =>
	typeof navigator !== 'undefined' && navigator.onLine === false;

/** Low urgency requests (BACKGROUND, OPTIONAL) are not worth retrying */
const isUrgent = (headers: HeadersInit | undefined): boolean => {
	const urgency = /u=(\d+)/.exec(
		(headers as Record<string, string> | undefined)?.[priorityHeaderName] || '',
	)?.[1];

	return !urgency || Number(urgency) < RequestPriority.BACKGROUND;
};

/**
 * fetch() retrying (a few times, quickly) when the request fails on network
 * level, e.g. the network not being ready yet on browser start or when waking
 * up the computer, or a network change. HTTP errors are never retried here.
 */
const fetchWithNetworkRetries = async (
	input: string,
	options: RequestInit,
	retryable: boolean,
): Promise<Response> => {
	for (let attempt = 0; ; attempt++) {
		try {
			return await fetch(input, options);
		} catch (error) {
			const retryDelay = networkRetryDelays[attempt];

			if (
				!retryable ||
				retryDelay === undefined ||
				!isNetworkError(error) ||
				!isUrgent(options.headers) ||
				isOffline()
			) {
				throw error;
			}

			await delay(retryDelay);
		}
	}
};

export const fetchApi = async (
	url: string,
	init?: ApiRequestInit,
	baseUrl?: string,
	inputSession?: Session,
): Promise<Response> => {
	const route = getRoute(init?.method || 'GET', url);
	const throttledResponse = getThrottledResponse(route);

	if (throttledResponse) {
		return throttledResponse;
	}

	const headers = {
		...(init?.headers as Record<string, string> | undefined),
	};

	if (!headers['x-pm-uid']) {
		await addSessionHeaders(
			headers,
			inputSession || (await readSessionOnceRefreshed()),
		);
	}

	const {retryOnNetworkError, ...requestInit} = init || {};
	const options = {
		mode: 'cors',
		credentials: 'include',
		redirect: 'follow',
		method: 'GET',
		...requestInit,
		headers: {
			'x-pm-appversion': getFullAppVersion(),
			'x-pm-browser-type': await getBrowserSubType(),
			// Callers should set their own priority (see withPriority),
			// this is only the fallback for calls not specifying any
			...getPriorityHeaders(RequestPriority.NORMAL),
			...headers,
		},
	} as RequestInit;

	const response = await fetchWithNetworkRetries(
		`${baseUrl || baseAPIURL}${url}`,
		options,
		retryOnNetworkError ??
			idempotentMethods.includes(`${options.method}`.toUpperCase()),
	);

	// If 429 / 503, check the Retry-After header
	// We don't handle the retry-logic here, it must be handled case by case if and
	// how many times we retry a given route in a given situation.
	// But we will ensure here that whatever is the specific logic it can never
	// retry sooner than what instructs the Retry-After sent by the server
	if (isRetriableResponse(response)) {
		rememberRetryAfter(route, response);
	}

	return response;
};
