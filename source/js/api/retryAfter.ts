import {routes} from '../config';
import {milliSeconds} from '../tools/milliSeconds';
import {makeResponseReplayable} from '../tools/makeResponseReplayable';

/**
 * Object to remember for each route (method + URL) until when (time)
 * we should not re-fetch (and so return instead the memorized response)
 */
const retryAfterPerRoute: Record<string, {time: number; response: Response}> =
	{};

/**
 * Return millisecond-timestamp.
 */
export const getRetryAfterTimestamp = (
	response: Response,
	defaultNumberOfSeconds = 0,
) => {
	const retryAfterHeader = `${response.headers.get('Retry-After') || defaultNumberOfSeconds}`;

	return Math.min(
		// Let's have a maximum of 7 days in case server went crazy
		Date.now() + milliSeconds.fromDays(7),
		// If the Retry-After is all digit
		/^\d+$/.test(retryAfterHeader)
			? // Then it's a number of seconds (as per https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After)
				Date.now() +
					milliSeconds.fromSeconds(Math.max(10, Number(retryAfterHeader)))
			: // Else, it's a date string
				new Date(retryAfterHeader).getTime(),
	);
};

const routeRegExps = Object.values(routes).reduce(
	(regExps, route) => {
		regExps[route] = new RegExp(`^${route.replace(/\{[^}]+}/g, '[^/]+')}$`);

		return regExps;
	},
	{} as Record<string, RegExp>,
);

/**
 * Identify the route (method + URL pattern) a request belongs to,
 * so throttling applies to every URL matching the same route.
 */
export const getRoute = (method: string, url: string) => {
	const path = url.split('?')[0] as string;

	for (const route of routes) {
		if (routeRegExps[route]!.test(path)) {
			return `${method} ${route}`;
		}
	}

	return `${method} ${path}`;
};

/**
 * Return the memorized response if we are ordered not to retry the route yet.
 */
export const getThrottledResponse = (route: string): Response | undefined => {
	const retryInfo = retryAfterPerRoute[route];

	if (!retryInfo) {
		return undefined;
	}

	// Give the last received response if we are ordered not to retry before a certain time
	if (retryInfo.time >= Date.now()) {
		// Stored with makeResponseReplayable(), so .text() or .json() can be called on it each time
		return retryInfo.response;
	}

	// If delay is over, we can forget
	delete retryAfterPerRoute[route];

	return undefined;
};

/**
 * Remember until when the given route must not be re-fetched,
 * as instructed by the Retry-After header of the response.
 */
export const rememberRetryAfter = (route: string, response: Response) => {
	const retryAfter = getRetryAfterTimestamp(response);

	if ((retryAfterPerRoute[route]?.time || 0) < retryAfter) {
		retryAfterPerRoute[route] = {
			time: retryAfter,
			response: makeResponseReplayable(response),
		};
	}
};
