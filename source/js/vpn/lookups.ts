import {type CacheWrappedValue, Storage, storage} from '../tools/storage';
import {triggerPromise} from '../tools/triggerPromise';
import {milliSeconds} from '../tools/milliSeconds';

/**
 * Too much IDs stored would lead to longer loading and slower UI, so we cap it.
 */
const maxLookupIdsStored = 1_000;

const lookups = storage.item<CacheWrappedValue<Record<string, number>>>(
	'lookups',
	Storage.LOCAL,
);

const lookupsNotFound = storage.item<CacheWrappedValue<Record<string, number>>>(
	'lookups-not-found',
	Storage.LOCAL,
);

type LookupStorage = typeof lookupsNotFound | typeof lookups;

const getLookupStorageRecentKeys = async (
	store: LookupStorage,
	threshold: number,
) => {
	const value = (await store.get())?.value || {};
	const ids = Object.keys(value);
	let idsToForget = 0;
	const usedIds = ids.filter((id) => {
		// If this ID was not touched for more than 100 days
		if (value[id]! < threshold) {
			// List them for removal
			delete value[id];
			idsToForget++;

			return false;
		}

		return true;
	});

	if (idsToForget) {
		triggerPromise(store.setValue(value));
	}

	return usedIds;
};

export const getLookupIds = async () =>
	getLookupStorageRecentKeys(
		lookups,
		// Forget about ID the extension didn't connect to for 100 days or more
		milliSeconds.fromDays(-100, Date.now()),
	);

const recordOnLookupStorage = (store: LookupStorage, id: string) => {
	triggerPromise(
		store.transaction(
			(cache) => {
				// If ID is not yet in cache
				if (!cache.value[id]) {
					const ids = Object.keys(cache.value);

					if (ids.length >= maxLookupIdsStored) {
						// Sort IDs from oldest to newest
						ids.sort((a, b) => cache.value[a]! - cache.value[b]!);
						// We remove older IDs so when we'll add the new ID, it's still exactly maxLookupIdsStored stored
						ids
							.slice(0, ids.length + 1 - maxLookupIdsStored)
							.forEach((oldId) => {
								delete cache.value[oldId];
							});
					}
				}

				cache.value[id] = Date.now();
				cache.time = Date.now();

				return cache;
			},
			{
				value: {} as Record<string, number>,
				time: Date.now(),
			},
		),
	);
};

export const recordLookupIdFound = (id: string | number) => {
	recordOnLookupStorage(lookups, `${id}`);
};

export const recordConnectionToLookupId = (id: string | number) => {
	triggerPromise(
		lookups.transactionValue(
			(value) => {
				const idString = `${id}`;

				// If this ID was obtained by lookup, then update the time so it does not
				// get picked first when cleaning up old IDs
				if (value[idString]) {
					value[idString] = Date.now();
				}

				return value;
			},
			{} as Record<string, number>,
		),
	);
};

export const recordLookupNameNotFound = (upperName: string) => {
	recordOnLookupStorage(lookupsNotFound, upperName);
};

export const wasLookupNameRecentlyNotFound = async (upperName: string) => {
	const notFounds = await lookupsNotFound.get();
	const lastSearched = notFounds?.value[upperName] ?? 0;
	const threshold = milliSeconds.fromDays(-7, Date.now());

	if (lastSearched > threshold) {
		return true;
	}

	// Trigger cleanup of old values (name not found earlier than 7 days ago)
	triggerPromise(getLookupStorageRecentKeys(lookups, threshold));

	// If name was not found for over 7 days, we can give it another try
	return false;
};
