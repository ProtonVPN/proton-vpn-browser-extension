import {fetchJson} from '../api';
import {getCacheAge} from '../tools/getCacheAge';
import {CacheWrappedValue, Storage, storage} from '../tools/storage';
import {Counts} from './Counts';
import {triggerPromise} from '../tools/triggerPromise';
import {getServerCountsBlockingUpdateTTL, getServerCountsTTL} from '../intervals';
import {handleError} from '../tools/sentry';

let countsFetching = false;
let fetchPromises = [] as ([(result: any) => void, (error: any) => void])[];

const serversCount = storage.item<CacheWrappedValue<Counts>>('servers-count', Storage.LOCAL);

const fetchServersCounts = async (): Promise<Counts> => {
	if (countsFetching) {
		return new Promise((resolve, reject) => {
			fetchPromises.push([resolve, reject]);
		});
	}

	countsFetching = true;

	try {
		const counts = await fetchJson<Counts>('vpn/servers-count');

		triggerPromise(serversCount.setValue(counts));
		fetchPromises.forEach(([resolve]) => {
			resolve(counts);
		});

		return counts;
	} catch (e) {
		fetchPromises.forEach(([, reject]) => {
			reject(e);
		});

		throw e;
	} finally {
		fetchPromises = [];
		countsFetching = false;
	}
};

export const getServersCount = async (): Promise<Counts> => {
	const cache = await serversCount.get();
	const age = getCacheAge(cache);

	// Use cache if fresh
	if (cache && age < getServerCountsTTL()) {
		return cache.value;
	}

	// Use cache but refresh in the background if it's a bit old but still good to use
	if (cache && age < getServerCountsBlockingUpdateTTL()) {
		triggerPromise(fetchServersCounts());

		return cache.value;
	}

	// Wait for the updated values from API if cache is empty or too old
	try {
		const counts = await fetchServersCounts();

		if (counts.Servers < 12_000 || counts.Countries < 110) {
			handleError(new Error(
				`Incorrect results from API: servers = ${counts.Servers}, countries = ${counts.Countries}`,
			));

			return {
				Servers: 13_626,
				Countries: 122,
				Capacity: 15_942,
			};
		}

		return counts;
	} catch (e) {
		if (cache?.value) {
			return cache.value;
		}

		throw e;
	}
};

