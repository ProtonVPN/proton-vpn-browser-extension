export const isCachedItem = (cachedItem: any): cachedItem is {time: number} => cachedItem
	&& (typeof cachedItem) === 'object'
	&& (typeof cachedItem?.time === 'number');

export const getCacheAge = (cachedItem: any): number => {
	if (isCachedItem(cachedItem)) {
		return Date.now() - cachedItem.time;
	}

	return Infinity;
};
