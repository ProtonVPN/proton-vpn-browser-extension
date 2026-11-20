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
const withSessionHeaders = async (
	headers: Record<string, string>,
	session: Session,
): Promise<Record<string, string>> => {
	const uid = session?.uid;
	const accessToken = session?.accessToken;

	if (uid && accessToken) {
		Object.assign(headers, getAuthHeaders(uid, accessToken));
		headers['x-pm-locale'] ??= (await getRegisteredLocale()) || getLocale();
	}

	return headers;
};

export const fetchApi = async (
	url: string,
	init?: RequestInit,
	baseUrl?: string,
	inputSession?: Session,
	tryUntil?: number,
): Promise<Response> => {
	const route = getRoute(init?.method || 'GET', url);
	const throttledResponse = getThrottledResponse(route);

	if (throttledResponse) {
		return throttledResponse;
	}

	const headers = (init?.headers || {}) as Record<string, string>;

	if (!headers['x-pm-uid']) {
		const session = inputSession || (await readSession());

		if (!session.expiresAt) {
			await withSessionHeaders(headers, session);
		} else if (!inputSession && (tryUntil || 0) < Date.now()) {
			await delay(200);

			return fetchApi(
				url,
				init,
				baseUrl,
				inputSession,
				tryUntil || milliSeconds.fromSeconds(8, Date.now()),
			);
		}
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
