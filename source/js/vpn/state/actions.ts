'use background';
/**
 * Actions switching between connection states.
 *
 * They can be imported from here directly, as long as the bundle loads
 * state.ts (the background one does through initState.ts): it registers the
 * state definitions (on, off, loggedout) that switchState() needs, and
 * loading this module registers the restoration actions in bootstrap.ts.
 * As all modules load before any of these actions can run, which path a
 * module imports them from doesn't matter.
 */
import type {
	ConnectionState,
	ErrorDump,
	SplitTunnelingConfig,
} from '../ConnectionState';
import {current, switchState} from './stateStore';
import {defineRestorationActions, getCurrentState} from './bootstrap';
import type {ApiError} from '../../api/ApiError';
import {clearAccountData} from '../../account/clearAccountData';
import type {Logical} from '../Logical';
import type {Server} from '../Server';
import {c} from '../../tools/translate';
import {emitNotification} from '../../notifications/emitNotification';
import {triggerPromise} from '../../tools/triggerPromise';
import {getErrorAsString} from '../../tools/getErrorMessage';
import {connectedServer} from '../connectedServer';
import {bind, info as info_} from '../../log/log';
import {setReviewInfoStateOnFailedConnection} from '../reviewInfo';
import {toProxyServer} from '../toProxyServer';
import {getAutoConnectTarget} from '../getAutoConnectTarget';
import {
	cancelProxyTakeoverReconnection,
	scheduleProxyTakeoverReconnection,
} from '../proxy/proxyTakeoverReconnection';
import {disarmKillSwitch, getKillSwitchServer} from './killSwitch';

const info = bind(info_, '[state]');

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

/** Reconnect to the server the kill switch is protecting (Reconnect button) */
export async function reconnectKillSwitchServer(): Promise<void> {
	const server = await getKillSwitchServer();

	if (server) {
		await connect({server});
	}
}

/** The kill switch is blocking the traffic (disconnected by a failure) */
export const isKillSwitchBlocking = (): boolean =>
	current()?.name === 'off' && !!current().data.blocked;

// Let bootstrap.ts restore the state without importing this module
defineRestorationActions({connectAfter, checkAutoConnect});

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
		: // Disconnection requested by the user, don't reconnect behind their back,
			// and lift the kill switch: the user chose to browse without VPN
			[
				() => {
					disarmKillSwitch();
					cancelProxyTakeoverReconnection();
				},
				c('Info').t`Disconnected`,
			];

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
