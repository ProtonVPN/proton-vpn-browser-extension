import {baseAPIURL, getFullAppVersion} from '../config';
import {readSession} from '../account/readSession';
import {getAuthHeaders} from '../account/getAuthHeaders';
import type {Session} from '../account/Session';
import {getRegisteredLocale} from '../account/user/getRegisteredLocale';
import {getLocale} from '../tools/locale';
import {milliSeconds} from '../tools/milliSeconds';
import {delay} from '../tools/delay';
import {getBrowserSubType} from '../tools/getBrowserSubType';
import {isRetriableResponse} from './errorGuards';
import {getRoute, getThrottledResponse, rememberRetryAfter} from './retryAfter';

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
const refreshPollInterval = 200; // milliseconds

const isRefreshInProgress = (session: Session | undefined): boolean =>
	typeof session?.expiresAt === 'number' &&
	Date.now() - session.expiresAt < refreshWaitLimit;

/**
 * Read the stored session, waiting (up to refreshWaitLimit) for a token
 * refresh in progress, possibly in another context, to complete. So that the
 * request uses the new tokens instead of the old ones (or no auth at all),
 * which would fail with 401 and start a competing refresh.
 */
const readSessionOnceRefreshed = async (): Promise<Session> => {
	const deadline = Date.now() + refreshWaitLimit;
	let session = await readSession();

	while (isRefreshInProgress(session) && Date.now() < deadline) {
		await delay(refreshPollInterval);
		session = await readSession();
	}

	return session;
};

export const fetchApi = async (
	url: string,
	init?: RequestInit,
	baseUrl?: string,
	inputSession?: Session,
): Promise<Response> => {
	const route = getRoute(init?.method || 'GET', url);
	const throttledResponse = getThrottledResponse(route);

	if (throttledResponse) {
		return throttledResponse;
	}

	const headers = (init?.headers || {}) as Record<string, string>;

	if (!headers['x-pm-uid']) {
		await addSessionHeaders(
			headers,
			inputSession || (await readSessionOnceRefreshed()),
		);
	}

	const options = {
		mode: 'cors',
		credentials: 'include',
		redirect: 'follow',
		method: 'GET',
		...init,
		headers: {
			'x-pm-appversion': getFullAppVersion(),
			'x-pm-browser-type': await getBrowserSubType(),
			...headers,
		},
	} as RequestInit;

	const response = await fetch(`${baseUrl || baseAPIURL}${url}`, options);

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
