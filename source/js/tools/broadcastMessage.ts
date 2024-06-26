import {sendMessageTo} from './sendMessageTo';
import {ApiError} from '../api';
import {ProxyServer} from '../vpn/ConnectionState';
import {error} from '../log/log';

export interface BroadcastMessage<T extends string = string, K = any> {
	type: T;
	data: K;
}

export interface ChangeStateMessage extends BroadcastMessage<'changeState', {
	state: 'connected' | 'connecting' | 'logged-out' | 'disconnected';
	server?: ProxyServer;
	error?: ApiError;
}> {}

export interface ExtensionUpdate extends BroadcastMessage<'updateExtension', {
	error?: ApiError;
}> {}

export const broadcastMessage = <T extends BroadcastMessage = ChangeStateMessage>(
	type: T['type'],
	data: T['data']|undefined = undefined,
): void => {
	sendMessageTo(type, data)
		.catch((e: any) => {
			if (`${e?.message || e}`.indexOf('Receiving end does not exist.') === -1) {
				error(e);
			}
		});
};
