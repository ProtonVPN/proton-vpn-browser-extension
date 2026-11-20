'use background';
/// <reference types="firefox-webext-browser"/>
import type {
	ConnectionState,
	ProxyServer,
	SplitTunnelingConfig,
} from '../ConnectionState';
import {asConnectionStateSwitch} from '../ConnectionState';
import {current, defineState, switchState} from './stateStore';
import {isServerHost, rememberServerHost} from './knownProxyHosts';
import {disconnect, disconnectByProxyTakeover, logOut} from './actions';
import type {ApiError} from '../../api/ApiError';
import type {ProxyInfo} from '../proxy/ProxyInfo';
import {
	getCredentials,
	loadCachedCredentials,
	loadCredentials,
} from '../../account/credentials/getConnectionCredentials';
import type {Credentials} from '../../account/credentials/Credentials';
import {
	getProxySettings,
	isProxyControlledAndConnected,
	proxyToServer,
} from '../../tools/proxy';
import {
	checkProxyControlledByOtherExtensions,
	checkProxyLevelOfControl,
} from '../proxy/checkProxyControlledByOtherExtensions';
import type {ProxyAuthentication} from '../proxy/ProxyAuthentication';
import {milliSeconds} from '../../tools/milliSeconds';
import {c} from '../../tools/translate';
import {catchPromise, triggerPromise} from '../../tools/triggerPromise';
import {notifyConnected, notifyConnecting} from './notifyConnection';
import {checkLogicalIsUp, postponeLogicalCheckUp} from './logicalCheckUp';
import {
	type BackgroundExtraData,
	SettingChange,
} from '../../messaging/MessageType';
import {bind, info as info_, warn as warn_} from '../../log/log';
import {handleError} from '../../tools/sentry';
import {mayReplaceCredentials} from '../../account/credentials/mayReplaceCredentials';
import {transmitCredentialsToProxy} from '../transmitCredentialsToProxy';
import {setReviewInfoStateLastSeenConnected} from '../reviewInfo';
import {sanitizeSplitTunnelingConfig} from '../sanitizeSplitTunnelingConfig';
import {getProxyInfoForRequest} from '../proxy/getProxyInfoForRequest';
import {getProxyAuthentication} from '../proxy/getProxyAuthentication';
import {
	getProxyControlledByOtherError,
	getProxyLevelOfControlError,
	getProxyNotConnectableError,
} from '../proxy/getProxyLevelOfControlError';
import OnAuthRequiredDetails = chrome.webRequest.OnAuthRequiredDetails;
import OnRequestDetails = browser.proxy._OnRequestDetails;

const info = bind(info_, '[state]');
const warn = bind(warn_, '[state]');

const hasWarning = () => !!(current()?.data?.error as ApiError)?.Warning;

// **** Logged in and connected ****
export const onState = defineState(
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
			triggerPromise(checkLogicalIsUp(this, credentials));

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
			postponeLogicalCheckUp();

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

					notifyConnected(server, current().data.error);
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
				triggerPromise(checkLogicalIsUp(this));
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

					notifyConnecting(current()?.data?.server);

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
				notifyConnected(current()?.data?.server, current().data.error);
			} else if (Date.now() - time > milliSeconds.fromSeconds(30)) {
				disconnect(current().data?.error || new Error('Connection timeout'));
			}
		},
	}),
);
