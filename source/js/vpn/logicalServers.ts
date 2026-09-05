import type {CacheWrappedValue} from '../tools/storage';
import {Storage, storage} from '../tools/storage';
import type {Logical} from './Logical';

export type LogicalServersCache = CacheWrappedValue<Logical[]> & {
	lastModified: string;
	lastLoadUpdate?: number;
	statusId: string;
};

export const logicalServers = storage.item<LogicalServersCache>(
	'logicals-servers',
	Storage.LOCAL,
);
