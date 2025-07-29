'use background';
import {ConnectionState, ConnectionStateSwitch, ErrorDump, ProxyServer} from './vpn/ConnectionState';
import {ApiError, fetchApi, isExcludedFromProxy} from './api';
import {ProxyInfo} from './proxy';
import {forgetCredentials} from './account/credentials/removeCredentials';
import {
	cancelNextCredentialFetch,
	getCredentials,
	getSynchronousCredentials,
	loadCachedCredentials,
	loadCredentials,
} from './account/credentials/getConnectionCredentials';
import {Credentials} from './account/credentials/Credentials';
import {setButton} from './tools/browserAction';
import {clearProxy, getFixedServerConfig, hasProxy, setProxy} from './tools/proxy';
import {
	authCheck,
	excludeApiFromProxy,
	proxyHost,
	proxyLocalNetworkExclusion,
	proxyPort,
	proxySecureCorePort,
	scheme,
	secureCoreEnabled,
	singleProxyPort,
} from './config';
import {isPending, markAsPending, WithIdentifiableRequest} from './tools/proxyAuth';
import {ProxyAuthentication} from './vpn/ProxyAuthentication';
import {milliSeconds} from './tools/milliSeconds';
import {Logical} from './vpn/Logical';
import {fetchWithUserInfo} from './account/fetchWithUserInfo';
import {forgetLogicals, getLogicalById, getSortedLogicals, isLogicalUp} from './vpn/getLogicals';
import {c} from './tools/translate';
import {Feature} from './vpn/Feature';
import {emitNotification} from './notifications/emitNotification';
import {checkNetwork} from './vpn/checkNetwork';
import {getAlternativeServer} from './vpn/getAlternatives';
import {triggerPromise} from './tools/triggerPromise';
import {persistentlyStoredSession, readSession, storedSession} from './account/readSession';
import {forgetLastChoice, getLastChoice, getLogicalsFilteredByChoice} from './vpn/lastChoice';
import {getUser} from './account/user/getUser';
import {getUserMaxTier} from './account/user/getUserMaxTier';
import {forgetUser} from './account/user/forgetUser';
import {forgetPmUser} from './account/user/forgetPmUser';
import {notifyStateChange} from './tools/notifyStateChange';
import {requireBestLogical} from './vpn/getLogical';
import {storage} from './tools/storage';
import {getErrorAsString} from './tools/getErrorMessage';
import {connectedServer} from './vpn/connectedServer';
import {Server} from './vpn/Server';
import {SettingChange} from './messaging/MessageType';
import {storedSplitTunneling} from './vpn/storedSplitTunneling';
import {getBypassList} from './vpn/getBypassList';
import {bind, debug as debug_, info as info_, warn as warn_} from './log/log';
import {getBasicAuth} from './vpn/getBasicAuth';
import {getAccessToken} from './account/getAccessToken';
import {pickServerInLogical} from './vpn/pickServerInLogical';
import {getSecureCorePredicate} from './vpn/getSecureCorePredicate';
import {delay} from './tools/delay';
import {getLogicalCheckUpRefreshInterval} from './intervals';
import {handleError} from './tools/sentry';
import {guessTierFromCredentials} from './account/credentials/guessTierFromCredentials';
import {mayReplaceCredentials} from './account/credentials/mayReplaceCredentials';
import {transmitCredentialsToProxy} from './vpn/transmitCredentialsToProxy';
import OnAuthRequiredDetails = chrome.webRequest.OnAuthRequiredDetails;
import OnRequestDetails = browser.proxy._OnRequestDetails;

const debug = bind(debug_, '[state]');
const info = bind(info_, '[state]');
const warn = bind(warn_, '[state]');

let currentState: ConnectionState;

let lastLogicalCheck = 0;

const hasWarning = () => !!(currentState?.data?.error as ApiError)?.Warning;

const serverHostnames: Record<string, boolean> = {};

export const isProxyKnownHost = (host: string): boolean => host === currentState?.data?.server?.proxyHost
	|| /^(.*\.)?protonvpn(\.net|\.com)(:\d+)?$/.test(host)
	|| !!serverHostnames[host];

export function getAuthCredentials(credentials: Credentials|undefined, requestDetails?: WithIdentifiableRequest): ProxyAuthentication | undefined {
	const data = currentState.data;

	if (credentials && (
		data.credsData?.Username !== credentials.Username ||
		data.credsData?.Password !== credentials.Password
	)) {
		Object.assign(data, {
			credsTry: 0,
			credsData: credentials,
		});
	}

	if (data.credsData) {
		if (!authCheck) {
			return {
				authCredentials: {
					username: data.credsData.Username,
					password: data.credsData.Password,
				},
			};
		}

		data.credsTry = (data.credsTry || 0) + 1;
		// Do not try more than 10 times

		if (data.credsTry < 10) {
			if (requestDetails) {
				markAsPending(requestDetails);
			}

			return {
				authCredentials: {
					username: data.credsData.Username,
					password: data.credsData.Password,
				},
			};
		}

		warn(data.credsTry + ' consecutive failures');
	}

	return undefined;
}

// **** Logged in and connected ****
const onState = {
	name: 'on',
	initializedAt: 0,
	proxyEnabled: false,
	refreshingState: false,

	init(oldState?: ConnectionState): void {
		this.proxyEnabled = false;
		currentState.data = {
			credsData: undefined,
			...oldState?.data,
		 	...currentState.data,
			starting: true,
		};

		if (typeof currentState.data.server === 'undefined') {
			return switchState(offState);
		}
	},

	async connectCurrentServer(): Promise<boolean> {
		const server = currentState?.data?.server;
		info("Connect to", server);

		return !!server && await this.setProxy(server, server.bypassList || []);
	},

	async setOption(type: SettingChange, data: any): Promise<void> {
		switch (type) {
			case SettingChange.BYPASS_LIST:
				if (currentState?.data?.server) {
					currentState.data.server.bypassList = data;
					await this.connectCurrentServer();
				}

				break;
		}
	},

	async setProxy(server: ProxyServer, bypassList: string[] = []): Promise<boolean> {
		if (currentState.data?.starting) {
			delete currentState.data.starting;
		}

		serverHostnames[server.proxyHost] = true;
		const credentials = await getCredentials();

		if (!credentials || ((await loadCachedCredentials())?.time || 0) < Date.now()) {
			warn(credentials ? 'Expired token' : 'No token');

			return false;
		}

		if (!await setProxy(getFixedServerConfig(server.proxyHost, server.proxyPort, bypassList))) {
			return false;
		}

		this.proxyEnabled = true;
		triggerPromise(this.checkLogicalIsUp(credentials));

		return true;
	},

	async setConnected(): Promise<void> {
		if (!currentState?.data?.server) {
			disconnect(new Error(c('Error').t`Server not found`));

			return;
		}

		const time = Date.now();
		const initialState = currentState;
		const server = currentState.data.server;
		const name = currentState.data.server.name;
		lastLogicalCheck = time;

		if (!(await this.connectCurrentServer())) {
			disconnect(new Error(c('Error').t`Not able to control the browser network settings, possibly a permission is missing`));

			return;
		}

		const host = currentState.data.server?.proxyHost;

		if (host) {
			const credsData = currentState?.data?.credsData;
			transmitCredentialsToProxy(host, credsData?.Username, credsData?.Password);
		}

		setTimeout(() => {
			if (initialState !== currentState || currentState.data.server?.name !== name) {
				return;
			}

			notifyStateChange('connected', {
				server,
				error: currentState.data.error,
			});

			const serverName = name || '';

			setButton(
				'on',
				`${c('Label').t`Protected`} - ${serverName}`,
			);
		}, Math.max(1, 200 - new Date().getTime() + time));
	},

	setCredentials(credentials: Credentials | undefined): void {
		const userName = credentials?.Username;
		const password = credentials?.Password;

		if (!userName || !password) {
			return;
		}

		const credsData = currentState?.data?.credsData;

		if (userName === credsData?.Username &&
			password === credsData?.Password
		) {
			if (currentState.data?.starting) {
				triggerPromise(this.setConnected());
			}

			return;
		}

		if (!mayReplaceCredentials(credsData, credentials)) {
			return;
		}

		Object.assign(currentState.data, {
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
		const id = currentState?.data?.server?.id;

		if (!id || (time - lastLogicalCheck) < getLogicalCheckUpRefreshInterval()) {
			return;
		}

		const initializedAt = this.initializedAt;
		lastLogicalCheck = time;

		try {
			await delay(500);

			if (!this.proxyEnabled || !isCurrentStateConnected()) {
				return;
			}

			const { LogicalServers: logicals } = await fetchWithUserInfo<{ LogicalServers: Logical[] }>('vpn/v1/logicals?ID[]=' + id);

			if (!logicals[0] || !isLogicalUp(logicals[0])) {
				const currentCredentials = credentials || await getCredentials(true);

				// No need to switch server before getting valid credentials, and if we don't get valid credentials
				// soon, it will disconnect anyway
				if (currentCredentials) {
					const {server, logical} = await getAlternativeServer(id, guessTierFromCredentials(currentCredentials));

					if (logical && server && initializedAt === getCurrentState().initializedAt) {
						await connectLogical(logical, server, currentState?.data?.server?.bypassList);
					}
				}
			}
		} catch (e) {
			checkNetwork(e);
		}
	},

	async refreshState(): Promise<void> {
		if (this.refreshingState) {
			return;
		}

		this.refreshingState = true;

		try {
			triggerPromise(this.checkLogicalIsUp());

			if (!currentState.data?.starting && await hasProxy()) {
				return;
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

				const server = currentState?.data?.server;
				const serverName = server?.name || '';

				notifyStateChange('connecting', {server});

				setButton(
					'connecting',
					/* translator: connection in progress to the server, for instance "Connecting to Paris #12" */
					c('Status').t`Connecting to ${serverName}`,
				);

				credentials = await getCredentials(true);

				if (!hasWarning() && (!credentials?.Username || !credentials?.Password)) {
					switchState(offState);

					return;
				}

				this.setCredentials(credentials);

				if (!currentState?.data?.server) {
					throw new Error('No server');
				}

				await this.connectCurrentServer();
			} catch (e) {
				disconnect(e as ApiError);
				handleError(e);
			}
		} finally {
			this.refreshingState = false;
		}
	},

	handleProxyRequest(requestDetails: OnRequestDetails): ProxyInfo | Promise<ProxyInfo> {
		// This is only to avoid proxy for localhost, but we might actually want to access the API via the proxy in normal cases
		// We should extend this to prevent proxying for LAN addresses
		const bypassList = [...proxyLocalNetworkExclusion, ...(currentState?.data?.server?.bypassList || [])];

		if (isExcludedFromProxy(requestDetails, excludeApiFromProxy, bypassList)) {
			return { type: 'direct' };
		}

		const formatOutput = (newCredentials: Credentials | undefined) => {
			const config = {
				type: scheme,
				host: currentState?.data?.server?.proxyHost,
				port: currentState?.data?.server?.proxyPort,
				...(getAuthCredentials(newCredentials, requestDetails)?.authCredentials),
			} as ProxyInfo;

			if (config.username && config.password) {
				config.proxyAuthorizationHeader = getBasicAuth(config.username, config.password);
			}

			return config;
		};
		const cachedCredentials = getSynchronousCredentials();

		if (cachedCredentials) {
			return formatOutput(cachedCredentials);
		}

		const tryCredentials = (retry: number): Promise<ProxyInfo> => getCredentials(true).then(credentials => {
			if (credentials) {
				return formatOutput(credentials);
			}

			return readSession().then(session => {
				if (retry > 0) {
					return delay(400).then(() => tryCredentials(retry - 1));
				}

				session?.uid
					? disconnect(new Error(c('Error').t`Server not found`))
					: logOut(true);

				return { type: 'direct' };
			});
		});

		return tryCredentials(3);
	},

	async handleProxyAuthentication(requestDetails: OnAuthRequiredDetails): Promise<ProxyAuthentication | undefined> {
		if (requestDetails.isProxy) {
			if (isPending(requestDetails)) {
				return {cancel: true};
			}

			const host = requestDetails.challenger.host;

			if (host === currentState?.data?.server?.proxyHost || serverHostnames[host]) {
				const credentials = await getCredentials();

				return (credentials && getAuthCredentials(credentials, requestDetails))
					|| {cancel: true};
			}
		}

		return undefined;
	},

	checkConnectingState(time: number): void {
		if (this.proxyEnabled) {
			const server = currentState?.data?.server;
			const serverName = server?.name || '';

			notifyStateChange('connected', {
				server,
				error: currentState.data.error,
			});

			setButton(
				'on',
				`${c('Label').t`Protected`} - ${serverName}`,
			);
		} else if (Date.now() - time > milliSeconds.fromSeconds(30)) {
			disconnect(currentState.data?.error || new Error('Connection timeout'));
		}
	},
};

// **** Logged out state ****
const loggedoutState = {
	name: 'loggedout',
	initializedAt: 0,
	async init(): Promise<void> {
		cancelNextCredentialFetch();
		//Always start clean
		currentState.data = {};

		setButton('loggedOut');

		notifyStateChange('logged-out');

		await clearProxy();
	},
	checkConnectingState(time: number): void {
		if (Date.now() - time > milliSeconds.fromSeconds(5)) {
			notifyStateChange('logged-out');
		}
	},
};

// **** Logged in, but not connected ****
const offState = {
	name: 'off',
	initializedAt: 0,
	async init(config?: ConnectionState): Promise<void> {
		cancelNextCredentialFetch();
		currentState.data = {};
		const error = config?.data?.error;

		if (error) {
			currentState.data.error = (error instanceof Error)
				? {
					message: error.message,
					stack: error.stack,
				}
				: error;
		}

		notifyStateChange('disconnected', {error});

		setButton(
			error ? 'error' : 'off',
			error && getErrorAsString(error),
		);

		await clearProxy();
	},
	async refreshState(): Promise<void> {
		if (currentState.data.server &&
			(Date.now() - this.initializedAt) > milliSeconds.fromSeconds(3) &&
			await hasProxy()
		) {
			await connect(currentState.data);
		}
	},
	checkConnectingState(time: number): void {
		if (Date.now() - time > milliSeconds.fromSeconds(5)) {
			notifyStateChange('disconnected', {
				error: currentState.data?.error || new Error('Connection initialization timeout'),
			});
		}
	},
};

export function switchState(state: ConnectionStateSwitch) {
	const oldState = currentState || undefined;
	currentState = Object.assign({data: {}}, state, {
		initializedAt: Date.now(),
	});
	info('Switch state to ' + currentState.name, currentState.data);
	currentState.init?.(oldState);
	currentState.refreshState?.();
	triggerPromise(connectedServer.setValue(currentState.data?.server));
}

export function logIn() {
	switchState(offState);
}

export function logOut(deleteSession: boolean) {
	switchState(loggedoutState);
	storedSession.get().then(async session => {
		forgetPmUser();
		forgetUser();
		triggerPromise(storedSession.remove());
		triggerPromise(persistentlyStoredSession.remove());
		forgetCredentials();
		forgetLogicals();
		forgetLastChoice();

		if (deleteSession && session?.uid) {
			triggerPromise(fetchApi('auth', {method: 'DELETE'}, undefined, session));
		}
	});

	emitNotification(
		'logged-out',
		c('Info').t`Logged out`,
	);
	info('Logged out');
}

export function disconnect(error?: ApiError | Error | ErrorDump | undefined) {
	emitNotification(
		'connected-server',
		error
			? `${getErrorAsString(error)}`
			: c('Info').t`Disconnected`,
	);

	getCurrentState().data.error = error;
	switchState(offState);
}

export async function connectLogical(logical: Logical, server: Server, bypassList?: string[]): Promise<void> {
	const secureCoreLogical = (logical.Features & Feature.SECURE_CORE) !== 0;
	const label = server.Label || '';

	await connect({
		server: {
			id: logical.ID,
			name: logical.Name,
			exitIp: server.ExitIP,
			entryCountry: logical.EntryCountry,
			exitCountry: logical.ExitCountry,
			exitCity: logical.Translations?.City || logical.City,
			exitEnglishCity: logical.City,
			secureCore: secureCoreLogical,
			proxyHost: proxyHost || server.Domain,
			proxyPort: secureCoreLogical
				? (proxySecureCorePort || proxyPort)
				: proxyPort + (!singleProxyPort && /^\d+$/.test(label) ? parseInt(label, 10) : 0),
			bypassList,
		},
	});
}

export async function connect(data: ConnectionState['data']): Promise<void> {
	return connectAfter(data, (await connectedServer.get())?.value?.name);
}

export async function connectAfter(
	data: ConnectionState['data'],
	previousName: string | undefined,
): Promise<void> {
	delete currentState.data.error;
	Object.assign(currentState.data, data);
	switchState(onState);

	const name = data?.server?.name;
	const city = data?.server?.exitCity;

	if (!previousName || previousName !== name) {
		emitNotification(
			'connected-server',
			name
				? (city
					? /*
					   * translator: ${name} is a server, example: Connected to US-NY#1 in New York
					   */ c('Info').t`Connected to ${name} in ${city}`
					: /*
					   * translator: ${name} is a server, example: Connected to US-NY#1
					   */ c('Info').t`Connected to ${name}`
				)
				: c('Info').t`Connected`,
		);
	}
}

export function isLoggedIn(): boolean {
	return currentState && currentState.name !== 'loggedout';
}

export function isCurrentStateConnected(): boolean {
	return currentState && currentState.name === 'on';
}

export async function checkAutoConnect(): Promise<void> {
	const storedAutoConnect = storage.item<{ value: boolean }>('auto-connect');
	const storedSecureCore = storage.item<{value: boolean}>('secure-core');
	const user = await getUser();

	if (!user) {
		return;
	}

	const [
		initialChoice,
		logicals,
		autoConnect,
		splitTunneling,
		secureCore,
	] = await Promise.all([
		getLastChoice(),
		getSortedLogicals(),
		storedAutoConnect.getDefined({value: true}),
		storedSplitTunneling.getDefined({value: []}),
		secureCoreEnabled
			? storedSecureCore.getDefined({value: false})
			: new Promise<{value: boolean}>((resolve) => {
				resolve({value: false});
			}),
	]);

	if (initialChoice?.connected && autoConnect?.value) {
		// Quit auto-connect if there is no session
		if (!(await readSession())?.uid) {
			return;
		}

		const userTier = getUserMaxTier(user);
		const filteredList = getLogicalsFilteredByChoice(logicals.filter(
			getSecureCorePredicate(userTier, secureCore),
		).filter(logical => userTier >= logical.Tier), initialChoice, id => {
			const logical = getLogicalById(id);

			return logical ? [logical] : [];
		});

		if (filteredList[0]) {
			const logical = (initialChoice.pick === 'random'
				? filteredList[Math.floor(Math.random() * filteredList.length)]
				: requireBestLogical(filteredList, userTier)) || filteredList[0];
			const server = pickServerInLogical(logical);

			if (server?.Domain) {
				await connectLogical(logical, server, getBypassList(userTier, splitTunneling.value));
			}
		}
	}
}

export function getCurrentStateIfDefined(): ConnectionState | undefined {
	return currentState;
}

let ready = false;
let starters = [] as (() => void)[];

export function waitForReadyState(): Promise<void> {
	return new Promise<void>(resolve => {
		if (ready) {
			resolve();

			return;
		}

		starters.push(resolve);
		getCurrentState();
	});
}

async function getDisconnectedState(): Promise<ConnectionStateSwitch> {
	try {
		return (await getAccessToken()) ? offState : loggedoutState;
	} catch (e) {
		return loggedoutState;
	}
}

export function getCurrentState(): ConnectionState {
	if (!currentState) {
		info('New state creation');
		currentState = {
			data: {},
		} as ConnectionState;
		connectedServer.get().then(async data => {
			const server = data?.value;

			if (server) {
				await connectAfter({server}, server.name);

				return;
			}

			debug("[getCurrentState]", data?.value);
			switchState(await getDisconnectedState());
			await checkAutoConnect();
		}).finally(() => {
			ready = true;

			starters.forEach(resolve => {
				resolve();
			});

			starters = [];
		});
	}

	return currentState;
}
