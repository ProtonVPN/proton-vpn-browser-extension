import type {Timed} from '../tools/storage';
import {Storage, storage} from '../tools/storage';
import type {ProxyServer} from './ConnectionState';

export const connectedServer = storage.item<
	Partial<Timed<{value: ProxyServer | undefined}>>
>('connectedServer', Storage.SESSION);

export const isConnected = async () =>
	!!(await connectedServer.get())?.value?.proxyHost;
