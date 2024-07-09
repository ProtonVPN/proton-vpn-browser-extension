import {Logical} from './Logical';
import {isNotModified} from '../api';
import {comp} from '../tools/comp';
import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {getCacheAge} from '../tools/getCacheAge';
import {CacheWrappedValue, Storage, storage} from '../tools/storage';
import {getCities} from './getCities';
import {triggerPromise} from '../tools/triggerPromise';
import {BroadcastMessage} from '../tools/broadcastMessage';
import {Feature} from './Feature';
import {torEnabled} from '../config';
import {isServerUp} from './isServerUp';
import {getLogicalsBlockingUpdateTTL, getLogicalsTTL} from '../intervals';

type LogicalServersCache = CacheWrappedValue<Logical[]> & {
	lastModified: string,
};

const logicalServers = storage.item<LogicalServersCache>('logicals-servers', Storage.LOCAL);

const map: Record<string, Logical> = {};

export const forgetLogicals = () => {
	triggerPromise(logicalServers.remove());
};

export interface BroadcastLogicals extends BroadcastMessage<'logicalUpdate'> {
	data: Logical[];
}

export const loadLoads = async (): Promise<Logical[]> => {
	const cache = await logicalServers.get();
	const age = getCacheAge(cache);

	// If the list is obsolete (too old to display)
	if (!cache || age > getLogicalsBlockingUpdateTTL()) {
		// Then user will wait for request to complete
		// and can only browse again the list when it succeeds
		return await fetchLogicals(cache);
	}

	const { LogicalServers: logicals } = await fetchWithUserInfo<{ LogicalServers: Logical[] }>('vpn/loads');
	const logicalsById: Record<string, Logical> = {};

	logicals.forEach(logical => {
		logicalsById[logical.ID] = logical;
	});

	cache.value.forEach(logical => {
		if (logicalsById[logical.ID]) {
			calculateLogicalUp(Object.assign(logical, logicalsById[logical.ID]));
		}
	});

	await logicalServers.set(cache);

	return cache.value;
};

const fetchLogicals = async (cache?: LogicalServersCache) => {
	try {
		// Use last raw string obtained from Last-Modified header if available
		const ifModifiedSince = cache?.lastModified;
		const {logicals, lastModified} = await fetchWithUserInfo<{
			logicals: Logical[], // From LogicalServers in the JSON response
			lastModified: string | null, // From Last-Modified response header
		}, { LogicalServers: Logical[] }>(
			'vpn/v1/logicals',
			{headers: {'If-Modified-Since': ifModifiedSince || 'Thu, 01 Jan 1970 00:00:00 GMT'}},
			(response, data: { LogicalServers: Logical[] }) => ({
				logicals: data?.LogicalServers,
				lastModified: response.headers.get('Last-Modified'),
			}),
		);
		logicals.forEach(calculateLogicalUp);

		triggerPromise(logicalServers.setValue(logicals, {lastModified}));
		triggerPromise(getCities());

		return logicals;
	} catch (e) {
		if (cache?.value) {
			const response = (e as any)?.response as Response | undefined;

			if (isNotModified(response)) {
				// Re-save the cached value with Last-Modified header
				// (which normally is also the same as the one already in the cache).
				// But the time: Date.now() called by .setValue() will stamp this value as
				// fresh so the BEX won't call /vpn/v1/logicals at all for the next 6 hours.
				triggerPromise(logicalServers.setValue(cache.value, {
					lastModified: response.headers.get('Last-Modified'),
				}));
			}

			return cache.value;
		}

		throw e;
	}
};

const getLogicals = async () => {
	const cache = await logicalServers.get();
	const age = getCacheAge(cache);

	// If logical list is fresh, just use the cache
	if (cache && age < getLogicalsTTL()) {
		return cache.value;
	}

	// If the list is not super fresh but still OK to display,
	// then we return it but asynchronously trigger a request
	// to update it
	if (cache && age < getLogicalsBlockingUpdateTTL()) {
		triggerPromise(fetchLogicals(cache));

		return cache.value;
	}

	return await fetchLogicals(cache);
};

const sortLogicals = (logicals: Logical[]) => {
	logicals.sort((a, b) => {
		if (a.ExitCountry === b.ExitCountry) {
			const [aPrefix, aSuffix] = a.Name.split('#', 2);
			const [bPrefix, bSuffix] = b.Name.split('#', 2);

			if (aPrefix === bPrefix) {
				if (/^\d+$/.test(aSuffix || '0') && /^\d+$/.test(bSuffix || '0')) {
					return comp(parseInt(aSuffix || '0', 10), parseInt(bSuffix || '0', 10));
				}

				return comp(aSuffix, bSuffix);
			}

			return comp(aPrefix, bPrefix);
		}

		return comp(a.ExitCountry, b.ExitCountry);
	});
};

export const getSortedLogicals = async () => {
	const logicals = (await getLogicals()).filter(
		logical => (
			// Only servers up to tier 2 support HTTP proxy
			logical.Tier <= ((global as any).logicalMaxTier || 2) &&
			// Remove when TOR will be supported
			(torEnabled || (logical.Features & Feature.TOR) === 0)
		),
	);
	sortLogicals(logicals);

	logicals.forEach(logical => {
		map[logical.ID] = logical;
	});

	return logicals;
};

export const getLogicalById = (id: Logical['ID']): Logical | undefined => map[id];

const calculateLogicalUp = (logical: Logical): void => {
	logical._up = (logical.Status > 0 && (logical.Servers || []).some(isServerUp));
};

export const isLogicalUp = (logical: Logical): boolean => {
	if (typeof logical._up === 'undefined') {
		calculateLogicalUp(logical);
	}

	return logical._up as boolean;
}
