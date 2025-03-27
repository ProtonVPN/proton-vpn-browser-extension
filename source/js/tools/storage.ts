export enum Storage {
	LOCAL = 'local',
	SYNC = 'sync',
	SESSION = 'session',
}

const defaultStorage = Storage.LOCAL;

export const sessionStorageType = defaultStorage;

const getFallbackStorage = (storage: Storage) => storage === Storage.LOCAL
	? localStorage
	: sessionStorage;

export const storage = {
	async getDefinedItem<T extends object>(
		key: string,
		defaultValue: T,
		storage: Storage = defaultStorage,
	): Promise<T> {
		return (await this.getItem<T>(key, defaultValue, storage)) || defaultValue;
	},
	async getItem<T extends object>(
		key: string,
		defaultValue: T | undefined = undefined,
		storage: Storage = defaultStorage,
	): Promise<T | undefined> {
		const prefixedKey = 'bex-' + key;

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
		} catch (e) {
			const fallbackStorage = getFallbackStorage(storage);

			try {
				const rawItem = await fallbackStorage.getItem(prefixedKey);

				if (typeof rawItem === 'string') {
					return JSON.parse(rawItem);
				}

				return defaultValue;
			} catch (e) {
				const lastStorage = ((window as any).bexStorage || ((window as any).bexStorage = {}));

				return lastStorage.hasOwnProperty(key) ? lastStorage[key] : defaultValue;
			}
		}
	},
	async setItem(
		key: string,
		value: object,
		storage: Storage = defaultStorage,
	): Promise<void> {
		const prefixedKey = 'bex-' + key;

		try {
			await chrome.storage[storage].set({[prefixedKey]: value});
		} catch (e) {
			const rawItem = JSON.stringify(value);

			try {
				getFallbackStorage(storage).setItem(prefixedKey, rawItem);
			} catch (e) {
				((window as any).bexStorage || ((window as any).bexStorage = {}))[key] = value;
			}
		}
	},
	async removeItem(key: string, storage: Storage = defaultStorage): Promise<void> {
		const prefixedKey = 'bex-' + key;

		try {
			await chrome.storage[storage].remove(prefixedKey);
		} catch (e) {
			try {
				getFallbackStorage(storage).removeItem(prefixedKey);
			} catch (e) {
				delete ((window as any).bexStorage || ((window as any).bexStorage = {}))[key];
			}
		}
	},
	item<T extends object>(key: string, storage: Storage = defaultStorage, valueKey: string = 'value') {
		const self = this;

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
				return this.set({time: Date.now(), [valueKey]: value, ...extraData} as T);
			},
			remove(): Promise<void> {
				return self.removeItem(key, storage);
			},
		};
	},
	selfItem<T extends object>(key: string, storage: Storage = defaultStorage) {
		return this.item<T>(key, storage, key);
	},
};

export type CacheItem<T extends object> = ReturnType<typeof storage.item<T>>;

export type Timed<T> = {time: number} & T;

export type CacheWrappedValue<T> = Timed<{value: T}>;
