'use background';
import type {ProxyInfo} from './ProxyInfo';

/**
 * Dead-end proxy: nothing listens on the discard port, so any request sent
 * there fails (closed) instead of going direct and leaking the real IP.
 */
export const waiterHost = 'localhost'; // 127.0.0.1
export const waiterPort = 9;

/** Firefox proxy.onRequest routing to the waiter host dead-end */
export const waiterHostProxyInfo: ProxyInfo = {
	type: 'http',
	host: waiterHost,
	port: waiterPort,
};
