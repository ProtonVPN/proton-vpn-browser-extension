import {crashReportOptIn} from '../../tools/sentry';
import {ToggleFeature} from './ToggleFeature';
import {getFeatureConfig} from './getFeatureConfig';
import type {CacheItem} from '../../tools/storage';
import type {Toggle} from './Toggle';

export class CrashReports extends ToggleFeature {
	public static override async create() {
		return new CrashReports(await getFeatureConfig('crash-reports'));
	}

	override getDefault() {
		return {value: true};
	}

	override getCacheItem() {
		return crashReportOptIn as CacheItem<Toggle>;
	}
}
