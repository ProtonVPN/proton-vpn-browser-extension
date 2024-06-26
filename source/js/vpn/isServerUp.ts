import {Server} from './Server';

export const isServerUp = (server: Server | undefined) => !!(
	server &&
	server.Status > 0 &&
	((server.ServicesDown || 0) & 3) === 0
);
