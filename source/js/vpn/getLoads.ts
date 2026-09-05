import {type CacheWrappedValue, storage} from '../tools/storage';
import type {LogicalLoad} from './Logical';
import {getCacheAge} from '../tools/getCacheAge';
import {milliSeconds} from '../tools/milliSeconds';
import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {extractLoadsAndStatuses} from './extractLoadsAndStatuses';
import {getLoadsMaxAge} from './getLoadsMaxAge';

export type Loads = {
	loads: LogicalLoad[];
	time: number;
};

export const getLoads = async (statusId: string): Promise<Loads> => {
	const cacheKey = 'server-status-' + statusId;
	const cache =
		await storage.getItem<CacheWrappedValue<LogicalLoad[]>>(cacheKey);

	if (
		getCacheAge(cache) <
		(await getLoadsMaxAge()) - milliSeconds.fromMinutes(1)
	) {
		return {
			loads: cache!.value,
			time: cache!.time,
		};
	}

	const loads = extractLoadsAndStatuses(
		await fetchWithUserInfo<ArrayBuffer>(
			`vpn/v2/status/${encodeURIComponent(statusId)}/binary`,
		),
	);

	const time = Date.now();

	await storage.setItem(cacheKey, {
		value: loads,
		time,
	});

	return {loads, time};
};
