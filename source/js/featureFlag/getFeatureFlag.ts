import type {CacheWrappedValue, Fetching} from '../tools/storage';
import {storage} from '../tools/storage';
import {getFeatureFlagTTL} from '../intervals';
import {fetchJson} from '../api/fetchJson';
import {RequestPriority, withPriority} from '../api/RequestPriority';
import {useCache} from '../tools/useCache';

type FeatureRecord = Record<string, {enabled: boolean}>;
type FeatureRecordCache = CacheWrappedValue<FeatureRecord> & Fetching;

export const featureFlagCache =
	storage.item<FeatureRecordCache>('feature-flag');

const fetchFeatureFlag = async (
	priority = RequestPriority.NORMAL,
): Promise<FeatureRecord> => {
	const data = await fetchJson<{
		toggles?: {name: string; enabled: boolean}[];
	}>('feature/v2/frontend', withPriority(priority));

	const record = {} as FeatureRecord;

	data.toggles?.forEach((feature) => {
		const name = feature.name;
		delete (feature as {name?: string}).name;
		record[name] = feature;
	});

	return record;
};

export const getFeatureFlag = async (name: string): Promise<boolean> =>
	(await useCache(featureFlagCache, fetchFeatureFlag, getFeatureFlagTTL()))?.[
		name
	]?.enabled ?? false;
