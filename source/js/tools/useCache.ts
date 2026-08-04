import {getCacheAge} from './getCacheAge';
import {watchWithSentry} from './sentry';
import {triggerPromise} from './triggerPromise';
import type {CacheItem, CacheWrappedValue, Fetching} from './storage';

export const useCache = async <T>(
	cacheItem: CacheItem<CacheWrappedValue<T> & Fetching>,
	fetcher: () => Promise<T> | T,
	ttl: number,
) => {
	const cache = await cacheItem.getOnceNoLongerFetching();
	const age = getCacheAge(cache);
	let value = cache?.value;

	if (age > ttl) {
		await cacheItem.setValue(value, {fetching: Date.now()});

		try {
			value = await watchWithSentry(fetcher);
		} catch {
			// Keep cached value
		}

		triggerPromise(cacheItem.setValue(value, {fetching: null}));
	} else if (age > ttl / 2) {
		cacheItem
			.setValue(value, {fetching: Date.now()})
			.then(fetcher)
			.then((newValue) => cacheItem.setValue(newValue, {fetching: null}));
	}

	return value;
};
