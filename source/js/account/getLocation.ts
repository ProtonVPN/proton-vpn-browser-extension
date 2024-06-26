import {fetchJson} from '../api';
import {Location} from './Location';
import {milliSeconds} from '../tools/milliSeconds';
import {Storage, storage, Timed} from '../tools/storage';
import {triggerPromise} from '../tools/triggerPromise';
import {isSuspended, suspend} from '../tools/exponentialBackoff';
import {delay} from '../tools/delay';
import {RefreshTokenError} from './RefreshTokenError';
import {excludeApiFromProxy} from '../config';
import {isConnected} from '../vpn/connectedServer';
import {getLocationRefreshInterval} from '../intervals';

const storedLocation = storage.item<Partial<Timed<{location: Location|undefined}>>>('location', Storage.LOCAL);
const locationFetching = storage.item<Partial<Timed<{}>>>('location-fetching', Storage.LOCAL);

triggerPromise(storedLocation.remove());

export const getCachedLocation = () => storedLocation.load();

const willLocationBeSentOutsideProxy = async () => {
	if (
		excludeApiFromProxy || // API generally excluded
		(chrome.proxy as any)?.onRequest // able to exclude specifically vpn/location calls
	) {
		return true;
	}

	// if there is no proxy connected, it's outside
	return await isConnected();
};

export const getLocation = async (): Promise<Location|undefined> => {
	const savedLocation = await getCachedLocation();
	const refreshInterval = getLocationRefreshInterval();

	if (milliSeconds.diffInMilliSeconds(savedLocation?.time) < refreshInterval || (await isSuspended('location'))) {
		return savedLocation?.location;
	}

	while (Date.now() - ((await locationFetching.get())?.time || 0) < milliSeconds.fromSeconds(2)) {
		await delay(200);
		const savedLocation = await getCachedLocation();

		if (milliSeconds.diffInMilliSeconds(savedLocation?.time) < refreshInterval) {
			return savedLocation?.location;
		}
	}

	if (!(await willLocationBeSentOutsideProxy())) {
		// Cannot get relevant result from vpn/location
		return savedLocation?.location;
	}

	try {
		await locationFetching.setValue(null);
		const location = await fetchJson<Location | undefined>('vpn/v1/location');

		if (location) {
			await storedLocation.set({
				time: Date.now(),
				location,
			});
		}

		return location;
	} catch (e) {
		suspend('location');

		if (e instanceof RefreshTokenError) {
			throw e;
		}

		return savedLocation?.location;
	} finally {
		triggerPromise(locationFetching.remove());
	}
};

export const fetchWithNetZone = async <T, D = any>(
	url: string,
	init?: RequestInit,
	resultBuilder?: (response: Response, data: D) => T,
): Promise<T> => {
	const netZone = (await getLocation())?.IP;

	if (netZone) {
		init || (init = {});
		init.headers = {...init.headers, 'x-pm-netzone': netZone};
	}

	return await fetchJson<T, D>(url, init, undefined, resultBuilder);
};
