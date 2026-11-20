import {sendMessageTo} from './sendMessageTo';
import type {ApiError} from '../api/ApiError';
import type {ProxyServer} from '../vpn/ConnectionState';
import {error} from '../log/log';

export interface BroadcastMessage<T extends string = string, K = unknown> {
	type: T;
	data: K;
}

export type ChangeStateMessage = BroadcastMessage<
	'changeState',
	{
		state: 'connected' | 'connecting' | 'logged-out' | 'disconnected';
		server?: ProxyServer;
		error?: ApiError;
	}
>;

export type ExtensionUpdate = BroadcastMessage<
	'updateExtension',
	{
		error?: ApiError;
	}
>;

export type CensorshipDetected = BroadcastMessage<
	'censorship-detected',
	{url: string}
>;

export const broadcastMessage = <
	T extends BroadcastMessage = ChangeStateMessage,
>(
	type: T['type'],
	data: T['data'] | undefined = undefined,
): void => {
	sendMessageTo(type, data).catch((e: unknown) => {
		if (
			!`${(e as Error | undefined)?.message || e}`.includes(
				'Receiving end does not exist.',
			)
		) {
			error(e);
		}
	});
};
