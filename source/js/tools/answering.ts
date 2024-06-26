export const allWatchers: (Record<string, (...args: any[]) => void>)[] = [];

export const watchBroadcastMessages = (watchers: Record<string, (...args: any[]) => void>) => {
	allWatchers.push(watchers);

	return () => {
		allWatchers.splice(allWatchers.indexOf(watchers), 1);
	};
}

export const watchOnceBroadcastMessage = (name: string, callback: (...args: any[]) => void) => {
	let unwatch: (() => void) | undefined = undefined;

	unwatch = watchBroadcastMessages({
		[name](...args: any[]) {
			callback(...args);
			unwatch?.();
		},
	});
};

chrome.runtime.onMessage.addListener((request: any) => {
	allWatchers.forEach(watchers => {
		const type = request.type;
		const watcher = type ? watchers[type] : undefined;

		if (typeof watcher === 'function') {
			watcher(request.data);

			return;
		}

		if (watchers['error'] && (request as any).error) {
			watchers['error']((request as any).error);
		}
	});

	return false;
});
