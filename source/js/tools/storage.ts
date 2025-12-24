import {TransactionError} from './TransactionError';

/** Browser Storage API https://developer.chrome.com/docs/extensions/reference/api/storage */
export enum Storage {
	/** Data is stored locally and cleared when the extension is removed. */
	LOCAL = 'local',
	/** Holds data in memory while an extension is loaded. The storage is cleared if the extension is disabled, reloaded or updated and when the browser restarts. */
	SESSION = 'session',
	/** If syncing is enabled, the data is synced to any Chrome browser that the user is logged into. If disabled, it behaves like **storage.local**. Chrome stores the data locally when the browser is offline and resumes syncing when it's back online. */
	SYNC = 'sync',
}

const defaultStorage = Storage.LOCAL;

/**
 * Session related data (tokens, credentials, user, etc.) are stored in `Storage.LOCAL` for persistence across tabs and browser restarts.
 */
export const sessionDataStorageType = defaultStorage;

export const storagePrefix = 'bex-';

const getFallbackStorage = (storage: Storage) => storage === Storage.SESSION
	? sessionStorage
	: localStorage;

const withoutPersistentStorage = <T>(
	error: any,
	callback: (lastStorage: Record<string, any>) => T
) => {
	const root = (
		typeof window === 'undefined'
			? (typeof global === 'undefined' ? undefined : global)
			: window
	) as any;

	if (!root) {
		throw error;
	}

	// Measure only 1% of the storage failure for trend analyze
	if (Math.random() < 0.01) {
		// Throw async so it does not block the fallback but can be collected by Sentry
		setTimeout(() => {
			throw error;
		}, 1);
	}

	return callback(root.bexStorage || (root.bexStorage = {}));
};

export const storage = {
	async getDefinedItem<T extends object>(
		key: string,
		defaultValue: T,
		storage: Storage = defaultStorage,
	): Promise<T> {
		return (await this.getItem<T, T>(key, defaultValue, storage)) || defaultValue;
	},
	async getItem<T extends object, D extends T | undefined = T | undefined>(
		key: string,
		defaultValue: D = undefined as D,
		storage: Storage = defaultStorage,
	): Promise<T | D> {
		const prefixedKey = storagePrefix + key;

		try {
			const data = await new Promise(resolve => {
				chrome.storage[storage].get(prefixedKey, resolve);
			});

			if (typeof data === 'object' && (data as any).hasOwnProperty(prefixedKey)) {
				return (data as any)[prefixedKey];
			}

			if (storage === Storage.LOCAL && (Storage.SESSION in chrome.storage)) {
				const data = await new Promise(resolve => {
					chrome.storage[Storage.SESSION].get(prefixedKey, resolve);
				});

				if (typeof data === 'object' && (data as any).hasOwnProperty(prefixedKey)) {
					return (data as any)[prefixedKey];
				}
			}

			return defaultValue;
		} catch (firstError) {
			const fallbackStorage = getFallbackStorage(storage);

			try {
				const rawItem = await fallbackStorage.getItem(prefixedKey);

				if (typeof rawItem === 'string') {
					return JSON.parse(rawItem);
				}

				return defaultValue;
			} catch (secondError) {
				return withoutPersistentStorage(
					firstError,
					lastStorage => lastStorage.hasOwnProperty(key) ? lastStorage[key] : defaultValue,
				);
			}
		}
	},
	async setItem(
		key: string,
		value: object,
		storage: Storage = defaultStorage,
	): Promise<void> {
		const prefixedKey = storagePrefix + key;

		try {
			await chrome.storage[storage].set({ [prefixedKey]: value });
		} catch (firstError) {
			const rawItem = JSON.stringify(value);

			try {
				getFallbackStorage(storage).setItem(prefixedKey, rawItem);
			} catch (secondError) {
				withoutPersistentStorage(firstError, lastStorage => {
					lastStorage[key] = value;
				});
			}
		}
	},
	async removeItem(key: string, storage: Storage = defaultStorage): Promise<void> {
		const prefixedKey = storagePrefix + key;

		try {
			await chrome.storage[storage].remove(prefixedKey);
		} catch (firstError) {
			try {
				getFallbackStorage(storage).removeItem(prefixedKey);
			} catch (secondError) {
				withoutPersistentStorage(firstError, lastStorage => {
					delete lastStorage[key];
				});
			}
		}
	},
	item<T extends object>(key: string, storage: Storage = defaultStorage, valueKey: string = 'value') {
		const self = this;
		let transactionStart: number | undefined = undefined;

		return {
			key,
			get(defaultValue: T | undefined = undefined): Promise<T | undefined> {
				return self.getItem<T>(key, defaultValue, storage);
			},
			getDefined(defaultValue: T): Promise<T> {
				return self.getDefinedItem<T>(key, defaultValue, storage);
			},
			async load(defaultValue: T | undefined = undefined): Promise<Partial<T>> {
				try {
					const value = await self.getItem<T>(key, defaultValue, storage);

					return typeof value === 'object' ? value : {};
				} catch (e) {
					return {};
				}
			},
			set(value: T): Promise<void> {
				return self.setItem(key, value, storage);
			},
			setValue(value: any, extraData: Record<string, any> = {}): Promise<void> {
				return this.set({ time: Date.now(), [valueKey]: value, ...extraData } as T);
			},
			remove(): Promise<void> {
				return self.removeItem(key, storage);
			},
			async transaction<D extends T | undefined = T | undefined>(
				callback: (value: T | D) => T | D | undefined,
				defaultValue: D = undefined as D,
			): Promise<void> {
				if (transactionStart) {
					throw new TransactionError();
				}

				transactionStart = Date.now();
				const result = callback(await self.getItem<T, D>(key, defaultValue, storage));
				await (typeof result === 'undefined'
					? self.removeItem(key, storage)
					: self.setItem(key, result, storage)
				);
				transactionStart = undefined;
			},
		};
	},
	selfItem<T extends object>(key: string, storage: Storage = defaultStorage) {
		return this.item<T>(key, storage, key);
	},
};

export type CacheItem<T extends object> = ReturnType<typeof storage.item<T>>;

export type Timed<T> = { time: number } & T;

export type CacheWrappedValue<T> = Timed<{ value: T }>;
