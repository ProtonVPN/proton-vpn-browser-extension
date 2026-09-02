import type {Logical} from './Logical';
import {type CacheWrappedValue, Storage, storage} from '../tools/storage';

export type LogicalServersCache = CacheWrappedValue<Logical[]> & {
	/** Raw `Last-Modified` header of the response the list comes from. */
	lastModified: string;
	lastLoadUpdate?: number;
	/**
	 * Reference of the status list the cached logicals point at through their
	 * `StatusReference.Index`. Only set for lists coming from logicals v2, which
	 * is also how a v2 cache is told apart from a v1 one.
	 */
	statusId?: string;
};

export const logicalServers = storage.item<LogicalServersCache>(
	'logicals-servers',
	Storage.LOCAL,
);
