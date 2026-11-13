'use background';
/// <reference types="firefox-webext-browser"/>
import type {
	ConnectionState,
	ErrorDump,
	ProxyServer,
	SplitTunnelingConfig,
} from './vpn/ConnectionState';
import {asConnectionStateSwitch} from './vpn/ConnectionState';
import type {StateName} from './vpn/state/stateStore';
import {
	createInitialState,
	defineState,
	getCurrentStateIfDefined,
	isCurrentStateConnected,
	switchState,
} from './vpn/state/stateStore';
import {isServerHost, rememberServerHost} from './vpn/state/knownProxyHosts';
import type {ApiError} from './api';
import type {ProxyInfo} from './vpn/proxy/ProxyInfo';
import {clearAccountData} from './account/clearAccountData';
import {
	cancelNextCredentialFetch,
	getCredentials,
	loadCachedCredentials,
	loadCredentials,
} from './account/credentials/getConnectionCredentials';
import type {Credentials} from './account/credentials/Credentials';
import {setButton} from './tools/browserAction';
import {
	clearProxy,
	getProxyLevelOfControl,
	getProxySettings,
	hasProxy,
	isProxyControlledAndConnected,
	proxyToServer,
} from './tools/proxy';
import {
	checkProxyControlledByOtherExtensions,
	checkProxyLevelOfControl,
} from './vpn/proxy/checkProxyControlledByOtherExtensions';
import type {ProxyAuthentication} from './vpn/proxy/ProxyAuthentication';
import {milliSeconds} from './tools/milliSeconds';
import type {Logical} from './vpn/Logical';
import {c} from './tools/translate';
import {emitNotification} from './notifications/emitNotification';
import {checkNetwork} from './vpn/checkNetwork';
import {catchPromise, triggerPromise} from './tools/triggerPromise';
import {notifyStateChange} from './tools/notifyStateChange';
import {getErrorAsString} from './tools/getErrorMessage';
import {connectedServer} from './vpn/connectedServer';
import type {Server} from './vpn/Server';
import {type BackgroundExtraData, SettingChange} from './messaging/MessageType';
import {bind, debug as debug_, info as info_, warn as warn_} from './log/log';
import {getAccessToken} from './account/getAccessToken';
import {
	getActivityCheckInterval,
	getLogicalCheckUpRefreshInterval,
} from './intervals';
import {delay} from './tools/delay';
import {handleError} from './tools/sentry';
import {updateLastActivityTime} from './tools/activity';
import {mayReplaceCredentials} from './account/credentials/mayReplaceCredentials';
import {transmitCredentialsToProxy} from './vpn/transmitCredentialsToProxy';
import {
	setReviewInfoStateLastSeenConnected,
	setReviewInfoStateOnFailedConnection,
} from './vpn/reviewInfo';
import {toProxyServer} from './vpn/toProxyServer';
import {sanitizeSplitTunnelingConfig} from './vpn/sanitizeSplitTunnelingConfig';
import {getAutoConnectTarget} from './vpn/getAutoConnectTarget';
import {getReplacementServer} from './vpn/getReplacementServer';
import {getProxyInfoForRequest} from './vpn/proxy/getProxyInfoForRequest';
import {getProxyAuthentication} from './vpn/proxy/getProxyAuthentication';
import {
	getProxyControlledByOtherError,
	getProxyLevelOfControlError,
	getProxyNotConnectableError,
} from './vpn/proxy/getProxyLevelOfControlError';
import {
	cancelProxyTakeoverReconnection,
	getProxyTakeoverReconnectionServer,
	scheduleProxyTakeoverReconnection,
} from './vpn/proxy/proxyTakeoverReconnection';
import OnAuthRequiredDetails = chrome.webRequest.OnAuthRequiredDetails;
import OnRequestDetails = browser.proxy._OnRequestDetails;

const debug = bind(debug_, '[state]');
const info = bind(info_, '[state]');
const warn = bind(warn_, '[state]');

// Kept exported from here for compatibility, prefer importing from
// ./vpn/state/* directly where the actions below are not needed
export {
	getCurrentStateIfDefined,
	isCurrentStateConnected,
	isLoggedIn,
	logIn,
	switchState,
} from './vpn/state/stateStore';
export {
	getAuthCredentials,
	isProxyKnownHost,
} from './vpn/state/knownProxyHosts';

/**
 * Current state, typed as defined: it is created by getCurrentState()
 * before anything here reads it.
 */
const current = () => getCurrentStateIfDefined() as ConnectionState;

let lastLogicalCheck = 0;

const hasWarning = () => !!(current()?.data?.error as ApiError)?.Warning;

export async function connectAfter(
	data: ConnectionState['data'],
	previousName: string | undefined,
): Promise<void> {
	// A new connection (manual or automatic) replaces any pending reconnection
	cancelProxyTakeoverReconnection();
	delete current().data.error;
	Object.assign(current().data, data);
	switchState('on');

	const name = data?.server?.name;
	const city = data?.server?.exitCity;

	if (!previousName || previousName !== name) {
		emitNotification(
			'connected-server',
			name
				? city
					? /*
						 * translator: ${name} is a server, example: Connected to US-NY#1 in New York
						 */ c('Info').t`Connected to ${name} in ${city}`
					: /*
						 * translator: ${name} is a server, example: Connected to US-NY#1
						 */ c('Info').t`Connected to ${name}`
				: c('Info').t`Connected`,
		);
	}
}

export async function connect(data: ConnectionState['data']): Promise<void> {
	return connectAfter(data, (await connectedServer.get())?.value?.name);
}

export async function connectLogical(
	logical: Logical,
	server: Server,
	splitTunneling?: SplitTunnelingConfig,
): Promise<void> {
	await connect({server: toProxyServer(logical, server, splitTunneling)});
}

export async function checkAutoConnect(): Promise<void> {
	const target = await getAutoConnectTarget();

	if (target) {
		await connectLogical(target.logical, target.server, target.splitTunneling);
	}
}

async function getDisconnectedState(): Promise<StateName> {
	try {
		return (await getAccessToken()) ? 'off' : 'loggedout';
	} catch {
		return 'loggedout';
	}
}

let ready = false;
let starters = [] as (() => void)[];

export function getCurrentState(): ConnectionState {
	const existingState = getCurrentStateIfDefined();

	if (existingState) {
		return existingState;
	}

	info('New state creation');
	const state = createInitialState();
	connectedServer
		.get()
		.then(async (data) => {
			const server = data?.value;

			if (server) {
				await connectAfter({server}, server.name);

				return;
			}

			debug('[getCurrentState]', data?.value);
			switchState(await getDisconnectedState());
			await checkAutoConnect();
		})
		.finally(() => {
			ready = true;

			starters.forEach((resolve) => {
				resolve();
			});

			starters = [];
		});

	return state;
}

export function waitForReadyState(): Promise<void> {
	return new Promise<void>((resolve) => {
		if (ready) {
			resolve();

			return;
		}

		starters.push(resolve);
		getCurrentState();
	});
}

export function logOut(deleteSession: boolean) {
	cancelProxyTakeoverReconnection();
	switchState('loggedout');
	triggerPromise(clearAccountData(deleteSession));

	emitNotification('logged-out', c('Info').t`Logged out`);
	info('Logged out');
}

export function disconnect(error?: ApiError | Error | ErrorDump | undefined) {
	const [disconnectionHook, disconnectionMessage] = error
		? // There is an error, it's not voluntary
			[setReviewInfoStateOnFailedConnection, `${getErrorAsString(error)}`]
		: // Disconnection requested by the user, don't reconnect behind their back
			[cancelProxyTakeoverReconnection, c('Info').t`Disconnected`];

	disconnectionHook();

	emitNotification('connected-server', disconnectionMessage);

	getCurrentState().data.error = error;
	switchState('off');
}

/**
 * Disconnect because another extension took control over the proxy settings,
 * and reconnect to the current server once we get the control back.
 */
export function disconnectByProxyTakeover(error: Error): void {
	scheduleProxyTakeoverReconnection(current()?.data?.server);
	disconnect(error);
}

let reconnectingAfterProxyTakeover = false;

/**
 * If disconnected by a proxy takeover, reconnect to the previous server
 * as soon as the other extension released the proxy settings.
 */
async function reconnectAfterProxyTakeover(
	state: ConnectionState,
): Promise<void> {
	if (reconnectingAfterProxyTakeover) {
		return;
	}

	reconnectingAfterProxyTakeover = true;

	try {
		const server = await getProxyTakeoverReconnectionServer();

		if (!server || state !== current()) {
			return;
		}

		// Fresh value, not the shared cache of checkProxyLevelOfControl()
		// which may still hold the level from before the takeover
		const levelOfControl = await getProxyLevelOfControl();

		if (
			levelOfControl !== 'controllable_by_this_extension' &&
			levelOfControl !== 'controlled_by_this_extension'
		) {
			return;
		}

		// User may have connected, disconnected or logged out meanwhile
		if (
			state !== current() ||
			(await getProxyTakeoverReconnectionServer()) !== server
		) {
			return;
		}

		info('Proxy control is back, reconnect to', server.name);
		await connect({server});
	} finally {
		reconnectingAfterProxyTakeover = false;
	}
}

// **** Logged in and connected ****
defineState(
	asConnectionStateSwitch({
		name: 'on',
		initializedAt: 0,
		proxyEnabled: false as boolean,
		refreshingState: false,
		/** Last known value for this connection, undefined until first checked */
		proxyControlledByOtherExtensions: undefined as boolean | undefined,

		init(oldState?: ConnectionState): void {
			this.proxyEnabled = false;
			this.proxyControlledByOtherExtensions = undefined;
			current().data = {
				credsData: undefined,
				...oldState?.data,
				...current().data,
				starting: true,
			};

			if (typeof current().data.server === 'undefined') {
				return switchState('off');
			}
		},

		async connectCurrentServer(): Promise<boolean> {
			const server = current()?.data?.server;
			info('Connect to', server);

			return (
				!!server && (await this.setProxy(server, server.splitTunneling || {}))
			);
		},

		async setOption<T extends SettingChange>(
			type: SettingChange,
			data?: T extends keyof BackgroundExtraData
				? BackgroundExtraData[T]
				: undefined,
		): Promise<void> {
			switch (type) {
				case SettingChange.BYPASS_LIST: {
					const server = current()?.data?.server;
					const splitTunneling = sanitizeSplitTunnelingConfig(data);

					if (!splitTunneling) {
						warn('Ignored invalid split tunneling config', data);

						break;
					}

					if (server) {
						server.splitTunneling = splitTunneling;
						await this.connectCurrentServer();
					}

					break;
				}
			}
		},

		async setProxy(
			server: ProxyServer,
			splitTunneling: SplitTunnelingConfig = {},
		): Promise<boolean> {
			if (current().data?.starting) {
				delete current().data.starting;
			}

			rememberServerHost(server.proxyHost);
			const credentials = await getCredentials();

			if (
				!credentials ||
				((await loadCachedCredentials())?.time || 0) < Date.now()
			) {
				warn(credentials ? 'Expired token' : 'No token');

				return false;
			}

			if (!(await proxyToServer(server, splitTunneling))) {
				return false;
			}

			this.proxyEnabled = true;
			triggerPromise(this.checkLogicalIsUp(credentials));

			setReviewInfoStateLastSeenConnected();

			return true;
		},

		async setConnected(): Promise<void> {
			const initialState = current();
			const server = initialState?.data?.server;

			if (!server) {
				disconnect(new Error(c('Error').t`Server not found`));

				return;
			}

			const time = Date.now();
			const name = server.name;
			lastLogicalCheck = time;

			if (!(await this.connectCurrentServer())) {
				disconnect(await getProxyNotConnectableError());

				return;
			}

			const host = current().data.server?.proxyHost;

			if (host) {
				const credsData = current()?.data?.credsData;
				transmitCredentialsToProxy(
					host,
					credsData?.Username,
					credsData?.Password,
				);
			}

			setTimeout(
				() => {
					if (
						initialState !== current() ||
						current().data.server?.name !== name
					) {
						return;
					}

					notifyStateChange('connected', {
						server,
						error: current().data.error,
					});

					const serverName = name || '';

					setButton('on', `${c('Label').t`Protected`} - ${serverName}`);
				},
				Math.max(1, 200 - Date.now() + time),
			);
		},

		setCredentials(credentials: Credentials | undefined): void {
			const userName = credentials?.Username;
			const password = credentials?.Password;

			if (!userName || !password) {
				return;
			}

			const credsData = current()?.data?.credsData;

			if (
				userName === credsData?.Username &&
				password === credsData?.Password
			) {
				if (current().data?.starting) {
					triggerPromise(this.setConnected());
				}

				return;
			}

			if (!mayReplaceCredentials(credsData, credentials)) {
				return;
			}

			Object.assign(current().data, {
				credsTry: 0,
				credsData: {
					Username: userName,
					Password: password,
				},
			});

			triggerPromise(this.setConnected());
		},

		async checkLogicalIsUp(credentials?: Credentials): Promise<void> {
			const time = Date.now();
			const id = current()?.data?.server?.id;

			if (!id || time - lastLogicalCheck < getLogicalCheckUpRefreshInterval()) {
				return;
			}

			const initializedAt = this.initializedAt;
			lastLogicalCheck = time;

			try {
				await delay(500);

				if (!this.proxyEnabled || !isCurrentStateConnected()) {
					return;
				}

				const {logical, server} =
					(await getReplacementServer(id, getCurrentState, credentials)) || {};

				if (
					logical &&
					server &&
					initializedAt === getCurrentState().initializedAt
				) {
					await connectLogical(
						logical,
						server,
						current()?.data?.server?.splitTunneling,
					);
				}
			} catch (e) {
				checkNetwork(e);
			}
		},

		async checkProxyControlTakeover(): Promise<void> {
			const controlled = await checkProxyControlledByOtherExtensions();
			const wasControlled = this.proxyControlledByOtherExtensions;
			this.proxyControlledByOtherExtensions = controlled;

			// Ignore if state changed meanwhile (e.g. already disconnected)
			if (controlled && !wasControlled && this === current()) {
				disconnectByProxyTakeover(getProxyControlledByOtherError(true));
			}
		},

		async refreshState(): Promise<void> {
			if (this.refreshingState) {
				return;
			}

			this.refreshingState = true;

			try {
				triggerPromise(this.checkLogicalIsUp());
				catchPromise(this.checkProxyControlTakeover());

				if (!current().data?.starting) {
					const proxySettings = await getProxySettings();

					if (await isProxyControlledAndConnected(proxySettings)) {
						return;
					}

					const proxyError = getProxyLevelOfControlError(
						proxySettings?.levelOfControl,
						true,
					);

					if (proxyError) {
						if (this === current()) {
							(proxySettings?.levelOfControl ===
								'controlled_by_other_extensions'
								? disconnectByProxyTakeover
								: disconnect)(proxyError);
						}

						return;
					}
				}

				try {
					let credentials = await loadCredentials();

					if (credentials) {
						this.setCredentials(credentials);

						return;
					}

					if (hasWarning()) {
						return;
					}

					const server = current()?.data?.server;
					const serverName = server?.name || '';

					notifyStateChange('connecting', {server});

					setButton(
						'connecting',
						/* translator: connection in progress to the server, for instance "Connecting to Paris #12" */
						c('Status').t`Connecting to ${serverName}`,
					);

					credentials = await getCredentials(true);

					if (
						!hasWarning() &&
						(!credentials?.Username || !credentials?.Password)
					) {
						switchState('off');

						return;
					}

					this.setCredentials(credentials);

					if (!current()?.data?.server) {
						throw new Error('No server');
					}

					if (!(await this.connectCurrentServer())) {
						const error = getProxyLevelOfControlError(
							await checkProxyLevelOfControl(),
						);

						if (error && this === current()) {
							disconnect(error);
						}
					}
				} catch (e) {
					disconnect(e as ApiError);
					handleError(e);
				}
			} finally {
				this.refreshingState = false;
			}
		},

		handleProxyRequest(
			requestDetails: OnRequestDetails,
		): ProxyInfo | null | Promise<ProxyInfo> {
			return getProxyInfoForRequest(
				requestDetails,
				() => current()?.data,
				(hasSession) => {
					if (hasSession) {
						disconnect(new Error(c('Error').t`Server not found`));

						return;
					}

					logOut(true);
				},
			);
		},

		handleProxyAuthentication(
			requestDetails: OnAuthRequiredDetails,
		): Promise<ProxyAuthentication | undefined> {
			return getProxyAuthentication(
				requestDetails,
				() => current().data,
				isServerHost,
			);
		},

		checkConnectingState(time: number): void {
			if (this.proxyEnabled) {
				const server = current()?.data?.server;
				const serverName = server?.name || '';

				notifyStateChange('connected', {
					server,
					error: current().data.error,
				});

				setButton('on', `${c('Label').t`Protected`} - ${serverName}`);
			} else if (Date.now() - time > milliSeconds.fromSeconds(30)) {
				disconnect(current().data?.error || new Error('Connection timeout'));
			}
		},
	}),
);

// **** Logged out state ****
defineState({
	name: 'loggedout',
	initializedAt: 0,
	async init(): Promise<void> {
		cancelNextCredentialFetch();
		//Always start clean
		current().data = {};

		setButton('loggedOut');

		notifyStateChange('logged-out');

		await clearProxy();
	},
	checkConnectingState(time: number): void {
		if (Date.now() - time > milliSeconds.fromSeconds(5)) {
			notifyStateChange('logged-out');
		}
	},
});

// **** Logged in, but not connected ****
defineState({
	name: 'off',
	initializedAt: 0,
	async init(config?: ConnectionState): Promise<void> {
		cancelNextCredentialFetch();
		current().data = {};
		const error = config?.data?.error;

		if (error) {
			current().data.error =
				error instanceof Error
					? {
							message: error.message,
							stack: error.stack,
						}
					: error;
		}

		notifyStateChange('disconnected', {error});

		setButton(error ? 'error' : 'off', error && getErrorAsString(error));

		await clearProxy();
	},
	async refreshState(): Promise<void> {
		catchPromise(reconnectAfterProxyTakeover(current()));

		if (
			current().data.server &&
			Date.now() - this.initializedAt! > milliSeconds.fromSeconds(3) &&
			(await hasProxy())
		) {
			await connect(current().data);
		}
	},
	checkConnectingState(time: number): void {
		if (Date.now() - time > milliSeconds.fromSeconds(5)) {
			notifyStateChange('disconnected', {
				error:
					current().data?.error ||
					new Error('Connection initialization timeout'),
			});
		}
	},
});

setInterval(() => {
	if (isCurrentStateConnected()) {
		triggerPromise(updateLastActivityTime());
	}
}, getActivityCheckInterval());
