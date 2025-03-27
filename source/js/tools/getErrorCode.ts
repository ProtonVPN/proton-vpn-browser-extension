export enum ErrorCode {
	FAILED = 'FAILED',
	ABORTED = 'ABORTED',
	TIMED_OUT = 'TIMED_OUT',
	BLOCKED_BY_CLIENT = 'BLOCKED_BY_CLIENT',
	NETWORK_CHANGED = 'NETWORK_CHANGED',
	NETWORK_IO_SUSPENDED = 'NETWORK_IO_SUSPENDED',
	TUNNEL_CONNECTION_FAILED = 'TUNNEL_CONNECTION_FAILED',
	PROXY_CONNECTION_FAILED = 'PROXY_CONNECTION_FAILED',
}

export const getErrorCode = (error: string): ErrorCode => {
	return error.replace(/^net::/, '').replace(/^ERR_/, '') as ErrorCode;
};
