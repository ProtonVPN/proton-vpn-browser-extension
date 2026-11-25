'use background';
import {tokenDuration} from '../../config';
import {isIdle} from '../../tools/idle';
import {handleError} from '../../tools/sentry';
import {debug, warn} from '../../log/log';
import {milliSeconds} from '../../tools/milliSeconds';
import {triggerPromise} from '../../tools/triggerPromise';
import {getErrorAsString} from '../../tools/getErrorMessage';
import {delay, setJitterTimeout} from '../../tools/delay';
import {unsafeRandom, unsafeRandomFloat} from '../../tools/random';
import {
	isForbiddenError,
	isInvalidTokenError,
	isNetworkError,
	isRetriableError,
	isUnauthorizedError,
} from '../../api/errorGuards';
import {RequestPriority, withPriority} from '../../api/RequestPriority';
import type {ApiError} from '../../api/ApiError';
import type {Credentials} from './Credentials';
import type {CredentialsCacheItem} from './storedCredentials';
import {readSession} from '../readSession';
import {refreshToken} from '../refreshToken';
import {getAccessToken} from '../getAccessToken';
import {fetchWithUserInfo} from '../fetchWithUserInfo';
import {disconnect} from '../../vpn/state/actions';
import {getCurrentState} from '../../vpn/state/bootstrap';
import {setConnectedButton} from '../../vpn/state/notifyConnection';
import {initAuthInterceptor} from '../../vpn/initAuthInterceptor';
import {checkNetwork} from '../../vpn/checkNetwork';
import {storedCredentials} from './storedCredentials';
import {getCredentialsData} from './getCredentialsData';

let credentialsFetching = false;
let waitingCredentialsPromises = [] as [
	(session: Credentials | undefined) => void,
	(error: unknown) => void,
][];
let credentialsFetchingRetries = 0;
let credentialNextFetching: NodeJS.Timeout | null = null;
let lastCredentials:
	| (CredentialsCacheItem & {
			halfLife: number;
			sessionUid: string | undefined;
	  })
	| undefined = undefined;

export const getLastCredentials = () => lastCredentials;

export const cancelNextCredentialFetch = () => {
	if (credentialNextFetching) {
		clearTimeout(credentialNextFetching);
	}
};

const updateLastCredentials = (
	credentials: Credentials,
	sessionUid: string | undefined,
) => {
	const jwtExpiration =
		getCredentialsData(lastCredentials?.credentials).expiration * 1000;
	const now = Date.now();
	const jsonExpiration = milliSeconds.fromSeconds(credentials.Expire, now);
	const halfTime = milliSeconds.fromSeconds(credentials.Expire / 2, now);

	lastCredentials = {
		time: jwtExpiration
			? Math.min(jwtExpiration, jsonExpiration)
			: jsonExpiration,
		halfLife: jwtExpiration
			? Math.min((now + jwtExpiration) / 2, halfTime)
			: halfTime,
		credentials,
		sessionUid,
	};

	triggerPromise(storedCredentials.set(lastCredentials));
};

/**
 * Despite many items stored where "time" is the creation time of the cached data, for credentials
 * it's actually the timestamp of the planned expiration.
 *
 * As it's a bit misleading, accessing this property directly is deprecated.
 */
const getCachedCredentialsExpirationTimeOf = (
	credentials?: CredentialsCacheItem,
) => credentials?.time || 0;

/**
 * Credentials are wiped when the session changes (see saveSession), so cached
 * ones not expired yet belong to the current session.
 */
const hasValidCachedCredentials = async (): Promise<boolean> =>
	getCachedCredentialsExpirationTimeOf(await storedCredentials.load()) >
	Date.now();

/** Delay (+ up to the same jitter) to try again a renewal failing on network level */
const renewalRetryDelay = milliSeconds.fromSeconds(30);

const fetchConnectionCredentialsRequest = async (
	sessionUid: string | undefined,
	priority: RequestPriority,
	retryable = true,
): Promise<Credentials | undefined> => {
	credentialsFetching = true;
	credentialsFetchingRetries++;

	try {
		if (credentialsFetchingRetries > 1) {
			await delay(
				Math.pow(2, credentialsFetchingRetries - 2) *
					unsafeRandomFloat(500, 2_000),
			);
		}

		const credentials = await fetchWithUserInfo<Credentials | undefined>(
			'vpn/v1/browser/token?Duration=' + tokenDuration,
			withPriority(priority, {
				headers: {
					'x-pm-try-number': `${credentialsFetchingRetries}`,
				},
			}),
		);
		await browser?.webRequest?.handlerBehaviorChanged?.();
		credentialsFetchingRetries = 0;

		const currentState = getCurrentState();

		if (credentials) {
			updateLastCredentials(credentials, sessionUid);

			if (currentState.proxyEnabled) {
				initAuthInterceptor();

				if (typeof currentState.setCredentials === 'function') {
					currentState.setCredentials(credentials);
				}
			}

			debug(
				'Fetch at ' +
					Date.now() +
					', expires at ' +
					(getCachedCredentialsExpirationTimeOf(lastCredentials) ||
						'unknown time'),
			);
		}

		const stateData = currentState.data;

		if (currentState.proxyEnabled && (stateData.error as ApiError)?.Warning) {
			delete stateData.error;
			setConnectedButton(stateData.server?.name);
		}

		return credentials;
	} catch (error) {
		(error as ApiError)._id = Date.now() + '-' + unsafeRandom();

		if (retryable && isInvalidTokenError(error)) {
			credentialsFetchingRetries--;
			await refreshToken();

			return fetchConnectionCredentialsRequest(sessionUid, priority, false);
		}

		// Renewal failing on network level (after a few quick retries, see
		// fetchApi) while the current credentials are still valid: the connection
		// keeps working, so don't warn the user (fetchConnectionCredentials()
		// schedules another try). If it still fails once they expire, the
		// user-blocking fetch will report it.
		if (isNetworkError(error) && (await hasValidCachedCredentials())) {
			warn(error);

			throw error;
		}

		try {
			checkNetwork(error, true);
		} catch {
			return undefined;
		}

		if (
			!isIdle() &&
			(isForbiddenError(error) ||
				credentialsFetchingRetries > 2 ||
				!isRetriableError(error))
		) {
			disconnect(error as Error | ApiError);
		}

		throw error;
	} finally {
		credentialsFetching = false;
		await browser?.webRequest?.handlerBehaviorChanged?.();
	}
};

export const loadCachedCredentials = () => storedCredentials.load();

export const getCachedCredentialsExpirationTime = async () =>
	getCachedCredentialsExpirationTimeOf(await loadCachedCredentials());

const fetchConnectionCredentials = async (
	sessionUid: string | undefined,
	priority: RequestPriority,
): Promise<Credentials | undefined> => {
	if (credentialsFetching) {
		return new Promise((resolve, reject) => {
			waitingCredentialsPromises.push([resolve, reject]);
		});
	}

	if (
		lastCredentials?.halfLife &&
		sessionUid &&
		lastCredentials.sessionUid === sessionUid &&
		Date.now() < lastCredentials.halfLife
	) {
		return lastCredentials.credentials;
	}

	const scheduleRenewal = (renewalDelay: number, jitter: number) => {
		cancelNextCredentialFetch();

		credentialNextFetching = setJitterTimeout(
			renewalDelay,
			jitter,
			async () => {
				credentialNextFetching = null;

				if (
					(await getCachedCredentialsExpirationTime()) >=
						Date.now() - 2 * jitter &&
					!credentialsFetching &&
					sessionUid === (await readSession())?.uid
				) {
					// Current credentials are still valid, but BACKGROUND is not used
					// as the proxy connection breaks if they expire before refresh succeeds
					// This could become BACKGROUND, once we'll make token 1-day long
					triggerPromise(
						fetchConnectionCredentials(sessionUid, RequestPriority.NORMAL),
					);
				}
			},
		);
	};

	try {
		const credentials = await fetchConnectionCredentialsRequest(
			sessionUid,
			priority,
		);

		if (credentials?.Code !== 1000) {
			throw new Error(
				getErrorAsString(credentials || {message: 'No credentials found'}),
			);
		}

		waitingCredentialsPromises.forEach(([resolve]) => {
			resolve(credentials);
		});
		waitingCredentialsPromises = [];
		credentialsFetching = false;
		updateLastCredentials(credentials, sessionUid);

		const margin = milliSeconds.fromSeconds(credentials.Expire) * 0.1;
		scheduleRenewal(
			milliSeconds.fromSeconds(credentials.Expire) - margin,
			margin,
		);

		return credentials;
	} catch (error) {
		waitingCredentialsPromises.forEach(([, reject]) => {
			reject(error);
		});
		waitingCredentialsPromises = [];
		credentialsFetching = false;

		// Other network errors are reported (checkNetwork) and end with no
		// credentials: this one is a renewal postponed while current credentials
		// are still valid (see fetchConnectionCredentialsRequest)
		if (isNetworkError(error)) {
			scheduleRenewal(renewalRetryDelay, renewalRetryDelay);
		}

		throw error;
	}
};

export const loadCredentials = async (): Promise<Credentials | undefined> => {
	const savedCredentials = await loadCachedCredentials();
	// negative if not yet expired, positive if expired
	const expiredSince = milliSeconds.diffInMilliSeconds(
		getCachedCredentialsExpirationTimeOf(savedCredentials),
	);
	const credentials = savedCredentials?.credentials;

	if (expiredSince > 0 && !credentialsFetching) {
		if (expiredSince > milliSeconds.fromSeconds(20) || !credentials) {
			return fetchConnectionCredentials(
				(await readSession())?.uid,
				RequestPriority.INTERACTIVE,
			);
		}

		triggerPromise(
			fetchConnectionCredentials(
				(await readSession())?.uid,
				RequestPriority.NORMAL,
			),
		);
	}

	return credentials;
};

/**
 * Report to Sentry (if crash reports are enabled) how often fetching connection
 * credentials fails with 401 despite the refresh-and-retry of the request
 * (it used to wipe the session, then log out once credentials expired).
 */
const reportCredentialsUnauthorized = (error: unknown) => {
	handleError(
		new Error('Unauthorized credentials fetch, re-authenticating'),
		undefined,
		{
			tags: {reAuthentication: 'unauthorizedCredentials'},
			extra: {
				apiError: getErrorAsString(error),
				code: (error as {Code?: number}).Code,
			},
		},
	);
};

export const getCredentials = async (
	tryReAuthentication = false,
): Promise<Credentials | undefined> => {
	const sessionUid = (await readSession())?.uid;

	if (!sessionUid) {
		return undefined;
	}

	await getAccessToken(); // Get an access token if we don't have one yet

	try {
		const credentials = await (async () => {
			const savedCredentials = await loadCachedCredentials();

			if (getCachedCredentialsExpirationTimeOf(savedCredentials) < Date.now()) {
				return fetchConnectionCredentials(
					sessionUid,
					RequestPriority.INTERACTIVE,
				);
			}

			return savedCredentials?.credentials;
		})();

		if (credentials || !tryReAuthentication) {
			return credentials;
		}
	} catch (e) {
		if (!tryReAuthentication || !isUnauthorizedError(e)) {
			throw e;
		}

		// Don't wipe the session: a 401 here can be transient (e.g. a token
		// rotation race), refreshToken() decides if the session is really dead
		// (10013 → SESSION_EXPIRED → logOut + createSession)
		reportCredentialsUnauthorized(e);
	}

	await refreshToken(); // Refresh the token and re-try if it expired

	return getCredentials();
};

export const getSynchronousCredentials = (): Credentials | undefined => {
	const time = getCachedCredentialsExpirationTimeOf(lastCredentials);
	const now = Date.now();

	if (time > now) {
		if (time - now < milliSeconds.fromSeconds(10)) {
			triggerPromise(getCredentials(true));
		}

		return lastCredentials?.credentials;
	}

	return undefined;
};

export const checkCredentials = async (sessionUid: string): Promise<void> => {
	if ((await getCachedCredentialsExpirationTime()) < Date.now()) {
		await fetchConnectionCredentials(sessionUid, RequestPriority.INTERACTIVE);
	}
};
