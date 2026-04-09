import {sendMessageTo} from './sendMessageTo';
import type {ApiError} from '../api';
import type {ProxyServer} from '../vpn/ConnectionState';
import {error} from '../log/log';

export interface BroadcastMessage<T extends string = string, K = any> {
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

export const broadcastMessage = <
	T extends BroadcastMessage = ChangeStateMessage,
>(
	type: T['type'],
	data: T['data'] | undefined = undefined,
): void => {
	sendMessageTo(type, data).catch((e: any) => {
		if (!`${e?.message || e}`.includes('Receiving end does not exist.')) {
			error(e);
		}
	});
};
