import {Credentials} from './Credentials';
import {
	ApiError,
	fetchJson,
	isForbiddenError,
	isInvalidTokenError,
	isRetriableError,
	isUnauthorizedError,
	needsLogout,
} from '../../api';
import {readSession} from '../readSession';
import {refreshToken} from '../refreshToken';
import {getAccessToken} from '../getAccessToken';
import {milliSeconds} from '../../tools/milliSeconds';
import {saveSession} from '../saveSession';
import {disconnect, getCurrentState, logOut} from '../../state';
import {setButton} from '../../tools/browserAction';
import {c} from '../../tools/translate';
import {checkNetwork} from '../../vpn/checkNetwork';
import {triggerPromise} from '../../tools/triggerPromise';
import {getErrorAsString} from '../../tools/getErrorMessage';
import {delay, setJitterTimeout} from '../../tools/delay';
import {CredentialsCacheItem, storedCredentials} from './storedCredentials';
import {backgroundOnly} from '../../context/backgroundOnly';
import {debug, warn} from '../../log/log';
import {tokenDuration} from '../../config';
import {isIdle} from '../../tools/idle';
import {initAuthInterceptor} from '../../vpn/initAuthInterceptor';
import {getCredentialsData} from './getCredentialsData';

backgroundOnly('credentials');

let credentialsFetching = false;
let waitingCredentialsPromises = [] as [((session: Credentials|undefined) => void), ((error: any) => void)][];
let credentialsFetchingRetries = 0;
let credentialNextFetching: NodeJS.Timeout|null = null;
let lastCredentials: (CredentialsCacheItem & {
	halfLife: number;
	sessionUid: string | undefined;
}) | undefined = undefined;

export const getLastCredentials = () => lastCredentials;

export const cancelNextCredentialFetch = () => {
	if (credentialNextFetching) {
		clearTimeout(credentialNextFetching);
	}
};

const updateLastCredentials = (credentials: Credentials, sessionUid: string | undefined) => {
	const expiration = getCredentialsData(lastCredentials?.credentials).expiration * 1000;
	const now = Date.now();
	const time = milliSeconds.fromSeconds(credentials.Expire, now);
	const halfTime = milliSeconds.fromSeconds(credentials.Expire / 2, now);

	lastCredentials = {
		time: expiration ? Math.min(expiration, time) : time,
		halfLife: expiration ? Math.min((now + expiration) / 2, halfTime) : halfTime,
		credentials,
		sessionUid,
	};

	triggerPromise(storedCredentials.set(lastCredentials));
};

const fetchConnectionCredentialsRequest = async (sessionUid: string | undefined, retryable = true): Promise<Credentials | undefined> => {
	credentialsFetching = true;
	credentialsFetchingRetries++;

	try {
		if (credentialsFetchingRetries > 1) {
			await delay(Math.pow(2, credentialsFetchingRetries - 2) * (500 + 1500 * Math.random()));
		}

		const credentials = await fetchJson<Credentials | undefined>('vpn/v1/browser/token?Duration=' + tokenDuration, {
			headers: {
				'x-pm-try-number': `${credentialsFetchingRetries}`,
			},
		});
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

			debug('Fetch at ' + Date.now() + ', expires at ' + (lastCredentials?.time || 'unknown time'));
		}

		const stateData = currentState.data;

		if (currentState.proxyEnabled && (stateData.error as ApiError)?.Warning) {
			delete stateData.error;
			const serverName = stateData.server?.name || '';

			setButton(
				'on',
				`${c('Label').t`Protected`} - ${serverName}`,
			);
		}

		return credentials;
	} catch (error) {
		(error as ApiError)._id = Date.now() + '-' + Math.random();

		if (retryable && isInvalidTokenError(error)) {
			credentialsFetchingRetries--;
			await refreshToken();

			return await fetchConnectionCredentialsRequest(sessionUid, false);
		}

		try {
			checkNetwork(error, true);
		} catch (e) {
			return undefined;
		}

		if (needsLogout(error)) {
			warn(error, new Error().stack);
			logOut(true);
		} else if (!isIdle() && (isForbiddenError(error) || credentialsFetchingRetries > 2 || !isRetriableError(error))) {
			disconnect(error as Error | ApiError);
		}

		throw error;
	} finally {
		credentialsFetching = false;
		await browser?.webRequest?.handlerBehaviorChanged?.();
	}
};

const fetchConnectionCredentials = async (sessionUid: string | undefined): Promise<Credentials|undefined> => {
	if (credentialsFetching) {
		return await new Promise((resolve, reject) => {
			waitingCredentialsPromises.push([resolve, reject]);
		});
	}

	if (lastCredentials?.halfLife && sessionUid && lastCredentials.sessionUid === sessionUid && Date.now() < lastCredentials.halfLife) {
		return lastCredentials.credentials;
	}

	try {
		const credentials = await fetchConnectionCredentialsRequest(sessionUid);

		if (credentials?.Code !== 1000) {
			throw new Error(getErrorAsString((credentials || {error: 'No credentials found'}) as any));
		}

		waitingCredentialsPromises.forEach(([resolve]) => {
			resolve(credentials);
		});
		waitingCredentialsPromises = [];
		credentialsFetching = false;
		updateLastCredentials(credentials, sessionUid);

		const margin = milliSeconds.fromSeconds(credentials.Expire) * 0.1;
		cancelNextCredentialFetch();

		credentialNextFetching = setJitterTimeout(milliSeconds.fromSeconds(credentials.Expire) - margin, margin, async () => {
			credentialNextFetching = null;

			const savedCredentials = await loadCachedCredentials();

			if (((savedCredentials?.time || 0) >= Date.now() - 2 * margin) &&
				!credentialsFetching &&
				sessionUid === (await readSession())?.uid
			) {
				triggerPromise(fetchConnectionCredentials(sessionUid));
			}
		});

		return credentials;
	} catch (error) {
		waitingCredentialsPromises.forEach(([, reject]) => {
			reject(error);
		});
		waitingCredentialsPromises = [];
		credentialsFetching = false;

		throw error;
	}
};

export const loadCachedCredentials = () => storedCredentials.load();

export const loadCredentials = async (): Promise<Credentials | undefined> => {
	const savedCredentials = await loadCachedCredentials();
	const age = (savedCredentials?.time || 0) - Date.now();
	const credentials = savedCredentials?.credentials;

	if (age < 0 && !credentialsFetching) {
		if (age < milliSeconds.fromSeconds(-20) || !credentials) {
			return await fetchConnectionCredentials((await readSession())?.uid);
		}

		triggerPromise(fetchConnectionCredentials((await readSession())?.uid));
	}

	return credentials;
};

export const getCredentials = async (tryReAuthentication = false): Promise<Credentials|undefined> => {
	const sessionUid = (await readSession())?.uid;

	if (!sessionUid) {
		return undefined;
	}

	await getAccessToken(); // Get an access token if we don't have one yet

	try {
		const credentials = await (async () => {
			const savedCredentials = await loadCachedCredentials();

			if ((savedCredentials?.time || 0) < Date.now()) {
				return await fetchConnectionCredentials(sessionUid);
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

		await saveSession({});
	}

	await refreshToken(); // Refresh the token and re-try if it expired

	return await getCredentials();
};

export const getSynchronousCredentials = (): Credentials|undefined => {
	const time = lastCredentials?.time || 0;
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
	const savedCredentials = await loadCachedCredentials();

	if ((savedCredentials?.time || 0) < Date.now()) {
		await fetchConnectionCredentials(sessionUid);
	}
};
