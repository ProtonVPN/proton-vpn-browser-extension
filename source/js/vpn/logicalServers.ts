import type {CacheWrappedValue} from '../tools/storage';
import {Storage, storage} from '../tools/storage';
import type {Logical} from './Logical';

export type LogicalServersCacheMetadata = {
	lastModified: string | null;
	lastLoadUpdate?: number;
	statusId: string | null;
};

export type LogicalServersCache = CacheWrappedValue<Logical[]> &
	LogicalServersCacheMetadata;

export const logicalServers = storage.item<
	LogicalServersCache,
	Logical[],
	LogicalServersCacheMetadata
>('logicals-servers', Storage.LOCAL);
