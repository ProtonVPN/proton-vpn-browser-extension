import {type CacheWrappedValue, storage} from '../tools/storage';
import type {Logical} from './Logical';
import {logicalServers} from './logicalServers';

export const getLatestCachedStatuses = async (): Promise<
	Partial<Logical>[]
> => {
	const statusId = (await logicalServers.get())?.statusId;

	if (!statusId) {
		return [];
	}

	const cacheKey = 'server-status-' + statusId;
	const cache =
		await storage.getItem<CacheWrappedValue<Partial<Logical>[]>>(cacheKey);

	return cache?.value ?? [];
};
