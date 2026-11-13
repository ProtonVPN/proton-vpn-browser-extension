'use popup';
import {getRuntime} from './getRuntime';

export const allWatchers: Record<string, (...args: unknown[]) => void>[] = [];

export const watchBroadcastMessages = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	watchers: Record<string, (...args: any[]) => void>,
) => {
	allWatchers.push(watchers);

	return () => {
		allWatchers.splice(allWatchers.indexOf(watchers), 1);
	};
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const messageListener = (request: any) => {
	allWatchers.forEach((watchers) => {
		const type = request.type;
		const watcher = type ? watchers[type] : undefined;

		if (typeof watcher === 'function') {
			watcher(request.data);

			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if (watchers['error'] && (request as any).error) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			watchers['error']((request as any).error);
		}
	});

	return false;
};

getRuntime()?.onMessage.addListener(messageListener);
