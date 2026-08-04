import {crashReportOptIn} from '../../tools/sentry';
import {ToggleFeature} from './ToggleFeature';
import {getFeatureConfig} from './getFeatureConfig';

export class CrashReports extends ToggleFeature {
	public static override async create() {
		return new CrashReports(await getFeatureConfig('crash-reports'));
	}

	override getDefault() {
		return {value: true};
	}

	override getCacheItem() {
		return crashReportOptIn;
	}
}
