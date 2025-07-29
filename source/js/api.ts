import {apiDomainsExclusion, baseAPIURL, getFullAppVersion, incompatibleSoftware} from './config';
import {readSession} from './account/readSession';
import {getAuthHeaders} from './account/getAuthHeaders';
import {Session} from './account/Session';
import {refreshToken} from './account/refreshToken';
import {isHostExcludedByIpMask} from './tools/ip';
import {c} from './tools/translate';
import {milliSeconds} from './tools/milliSeconds';
import {broadcastMessage, ExtensionUpdate} from './tools/broadcastMessage';
import {getUpdateError, setUpdateError} from './tools/update';
import {delay} from './tools/delay';
import {warn} from './log/log';
import {getBrowserSubType} from './tools/getBrowserSubType';
import {handleError} from './tools/sentry';
import OnRequestDetails = browser.proxy._OnRequestDetails;

export const jsonRequest = (method: string, body: any, headers: Record<string, string> = {}) => ({
	method,
	headers: {
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		...headers,
	},
	body: JSON.stringify(body),
});

/**
 * Object to remember for each route (method + URL) until when (time)
 * we should not re-fetch (and so return instead the memorized response)
 */
const retryAfterPerRoute: Record<string, {time: number, response: Response}> = {};

export const fetchApi = async (
	url: string,
	init?: RequestInit,
	baseUrl?: string,
	inputSession?: Session,
	tryUntil?: number,
): Promise<Response> => {
	const route = `${init?.method || 'GET'} ${url}`;
	const retryInfo = retryAfterPerRoute[route];

	if (retryInfo) {
		// Give the last received response if we are ordered not to retry before a certain time
		if (retryInfo.time >= Date.now()) {
			// We clone it so we can do .text() or .json() on it
			return retryInfo.response.clone();
		}

		// If delay is over, we can forget
		delete retryAfterPerRoute[route];
	}

	const headers = (init?.headers || {}) as Record<string, string>;

	if (!headers['x-pm-uid']) {
		const session = inputSession || await readSession();

		if (!session.expiresAt) {
			const uid = session?.uid;
			const accessToken = session?.accessToken;

			if (uid && accessToken) {
				Object.assign(headers, getAuthHeaders(uid, accessToken));
			}
		} else if (!inputSession && (tryUntil || 0) < Date.now()) {
			await delay(200);

			return fetchApi(url, init, baseUrl, inputSession, tryUntil || milliSeconds.fromSeconds(8, Date.now()));
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

	const response = await fetch(`${(baseUrl || baseAPIURL)}${url}`, options);

	// If 429 / 503, check the Retry-After header
	// We don't handle the retry-logic here, it must be handled case by case if and
	// how many times we retry a given route in a given situation.
	// But we will ensure here that whatever is the specific logic it can never
	// retry sooner than what instructs the Retry-After sent by the server
	if (isRetriableError(response)) {
		const retryAfterHeader = `${response.headers.get('Retry-After') || '0'}`;
		const retryAfter = Math.min(
			// Let's have a maximum of 30 minutes in case server went crazy
			Date.now() + milliSeconds.fromMinutes(30),
			// If the Retry-After is all digit
			/^\d+$/.test(retryAfterHeader)
				// Then it's a number of seconds (as per https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After)
				? Date.now() + milliSeconds.fromSeconds(Math.max(10, Number(retryAfterHeader)))
				// Else, it's a date string
				: (new Date(retryAfterHeader)).getTime(),
		);

		if ((retryAfterPerRoute[route]?.time || 0) < retryAfter) {
			retryAfterPerRoute[route] = {
				time: retryAfter,
				response: response.clone(),
			};
		}
	}

	return response;
};

/**
 * Get response as JSON if possible, else return generic error.
 *
 * Note: most of the error should not trigger this because this function is called when
 * HTTP status is 200, so well-formed JSON is expected.
 */
const getJsonContent = async <T = any>(response: Response): Promise<T> => {
	try {
		return await response.json();
	} catch (e) {
		await checkIfResponseWasBlocked(response);

		warn(response.status, e);

		throw new Error(c('Error').t`Service temporarily unavailable`);
	}
};

const buildResponseResult = async <T = any, D = any>(
	response: Response,
	resultBuilder?: (response: Response, data: D) => T,
): Promise<T> => {
	const data = await getJsonContent(response);

	return resultBuilder ? resultBuilder(response, data) : data;
};

const startLikeHtml = (text: string) => /^\s*</.test(text);

const guessBlockerFromHtml = (html: string) => {
	for (const blocker of incompatibleSoftware) {
		if (html.includes(blocker)) {
			return blocker;
		}
	}

	return null;
};

const getBlockingSoftwareErrorFromResponse = (text: string) => {
	const blockingSoftware = guessBlockerFromHtml(text);

	if (blockingSoftware) {
		return new Error(
			c('Info').t`VPN blocked by external software: ${blockingSoftware}.\n\nSome tools, like anti-viruses or proxies, can interfere with Proton VPN. You can try disabling it to confirm.`,
		);
	}

	handleError('HTML Content Received: ' + text);

	return new Error(
		c('Info').t`VPN blocked by external software.\n\nSome tools, like anti-viruses or proxies, can interfere with Proton VPN. Disable them and retry.`,
	);
}

const checkIfResponseWasBlocked = async (response: Response) => {
	const text = await response.text();

	if (startLikeHtml(text)) {
		throw getBlockingSoftwareErrorFromResponse(text);
	}

	return text;
};

/**
 * Get response as JSON if possible, or else as text, to be used for unexpected output
 * such as API error responses that may or may not contain JSON.
 */
const getResponseContent = async <T = any>(response: Response): Promise<T | string> => {
	try {
		return await response.clone().json();
	} catch (e) {
		return await checkIfResponseWasBlocked(response);
	}
};

export const fetchJson = async <T, D = any>(
	url: string,
	init?: RequestInit,
	baseUrl?: string,
	resultBuilder?: (response: Response, data: D) => T,
): Promise<T> => {
	const upgradeError = await getUpdateError();

	// If we have a recent force-upgrade, useless to call API
	if (upgradeError) {
		broadcastMessage<ExtensionUpdate>('updateExtension', {error: upgradeError});

		throw upgradeError;
	}

	const response = await fetchApi(url, init, baseUrl);

	if (!isSuccessfulResponse(response)) {
		const data = await getResponseContent(response);
		const error = (data?.Error ? data : new Error(data));
		error.response = response;

		if (error && typeof error === 'object') {
			error.httpStatus = response.status;
		}

		if (needsUpdate(data)) {
			broadcastMessage<ExtensionUpdate>('updateExtension', {error});
			setUpdateError(data);

			throw error;
		}

		setUpdateError(undefined);

		if (!/\/?auth(\/.*)$/.test(url) && isInvalidTokenError(error)) {
			const oldSession = await readSession();
			const oldUid = oldSession.uid;
			const oldAccessToken = oldSession.accessToken;
			const newSession = await refreshToken(oldSession);

			if (newSession.uid &&
				newSession.accessToken &&
				(newSession.uid !== oldUid || newSession.accessToken !== oldAccessToken)
			) {
				const retryResponse = await fetchApi(url, init, baseUrl, newSession);

				if (isSuccessfulResponse(retryResponse)) {
					return buildResponseResult<T>(retryResponse, resultBuilder);
				}
			}

			warn(error);
		}

		throw error;
	}

	setUpdateError(undefined);

	return buildResponseResult<T>(response, resultBuilder);
};

export const isExcludedFromProxy = (
	requestInfo: OnRequestDetails,
	apiExclusion: boolean,
	bypassList?: string[],
): boolean => {
	const url = new URL(requestInfo.url);
	const callHostname = url.hostname;

	if (
		(apiDomainsExclusion.indexOf(callHostname) !== -1) &&
		(apiExclusion || /^\/?(api\/)?vpn\/location(\?.*)?$/.test(url.pathname))
	) {
		return true;
	}

	return (bypassList || []).some(exclusion => {
		if (exclusion.charAt(0) === '.') {
			return (new RegExp(
				exclusion.replace('.', '\\.') + '$'
			)).test(callHostname);
		}

		if (isHostExcludedByIpMask(callHostname, exclusion)) {
			return true;
		}

		if (/[*\\/]/.test(exclusion)) {
			if (exclusion.indexOf('/') !== -1) {
				return (new RegExp(
					'^' +
					(exclusion.indexOf('//') === -1 ? '([^/]+\.)?' : '') +
					exclusion
						.replace('.', '\\.')
						.replace('*', '.*')
				)).test(exclusion.indexOf('://') === 0
					? requestInfo.url.replace(/^[a-z]+(:\/\/)/, '$1')
					: (exclusion.indexOf('//') === 0
						? requestInfo.url.replace(/^[a-z]+:(\/\/)/, '$1')
						: requestInfo.url
					)
				);
			}

			return (new RegExp(
				exclusion
					.replace('.', '\\.')
					.replace('*', '.*') + '$'
			)).test(callHostname);
		}

		return callHostname === exclusion;
	});
};

export enum ErrorActionCode {
	UPGRADE = 'Upgrade'
}

export enum ErrorActionCategory {
	MAIN_ACTION = 'main_action',
	SECONDARY_ACTION = 'secondary_action',
	LINK = 'link',
}

export interface ErrorAction {
	Code: ErrorActionCode;
	Category: ErrorActionCategory;
	Name: string;
	URL: string;
}

export interface DeviceLimitErrorDetails {
	Type: 'DeviceLimit';
	Title?: string;
	Body?: string | Array<{
		Component: string;
		Icon: string;
		Text: string;
	}>;
	Hint?: string;
	Actions?: ErrorAction[];
}

export interface ApiError<T = any, S extends number = number, C extends number = number> {
	httpStatus: S;
	Code: C;
	Error: string;
	Details?: T;
	Warning?: boolean;
	_id?: string;
}

export type UnauthorizedError<T = any, C extends number = number> = ApiError<T, 401, C>;

export type ForbiddenError<T = any, C extends number = number> = ApiError<T, 403, C>;

export type InvalidTokenError<T = any> = UnauthorizedError<T, 401>;

export const isSuccessfulResponse = (response: Response): boolean => response.status >= 200 && response.status < 300;

export const isNetworkError = (error: any): boolean => ((typeof error) === 'object') && (
	error?.name === 'NetworkError' ||
	/^(NetworkError |(TypeError: )?Failed to fetch)/.test(error?.message || '')
);

export const hasErrorHttpStatus = (error: any, httpStatus: number): error is ApiError => ((typeof error) === 'object') &&
	(error?.httpStatus === httpStatus);

export const isNotModified = (response: any): response is ApiError<any, 304, any> | {status: 304} => response?.status === 304 || hasErrorHttpStatus(response, 304);

export const isUnauthorizedError = (error: any): error is UnauthorizedError => hasErrorHttpStatus(error, 401);

export const isInvalidTokenError = (error: any): error is InvalidTokenError => isUnauthorizedError(error) && error.Code === 401;

export const isForbiddenError = (error: any): error is ForbiddenError => hasErrorHttpStatus(error, 403);

export const isDeviceLimitError = (error: any): error is ApiError<DeviceLimitErrorDetails> => error?.Details?.Type === 'DeviceLimit';

export const needsLogout = (error: any): error is ApiError => ((typeof error) === 'object') &&
	(error?.Code === 2028 || error?.Code === 2027);

export const needsUpdate = (error: any): error is ApiError => ((typeof error) === 'object') &&
	(error?.Code === 5003);

export const isRetriableError = (error: any): error is ApiError => ((typeof error) === 'object') &&
	(error?.Code === 429 || error?.Code === 503);
