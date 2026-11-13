/* c8 ignore start */

export interface ProxyInfo {
	type: 'direct' | 'https' | 'http';
	host?: string;
	port?: number | string;
	username?: string;
	password?: string;
	proxyAuthorizationHeader?: string;
}

/* c8 ignore stop */
