import type {CacheItem} from '../../tools/storage';

export interface LocallyStoredFeature<T extends object = object> {
	/**
	 * Return the storage item where current user preferences for the feature are stored.
	 */
	getCacheItem(): CacheItem<T>;
}
