const isCachedItem = (cachedItem: unknown): cachedItem is {time: number} =>
	Boolean(cachedItem) &&
	typeof cachedItem === 'object' &&
	typeof (cachedItem as {time?: unknown})?.time === 'number';

/**
 * Return age of a cache item in milliseconds.
 */
export const getCacheAge = (cachedItem: unknown): number => {
	if (isCachedItem(cachedItem)) {
		return Date.now() - cachedItem.time;
	}

	return Infinity;
};
