import {telemetryEnabled} from '../../config';
import {telemetryOptIn} from '../../tools/telemetry';
import {ToggleFeature} from './ToggleFeature';
import {getFeatureConfig} from './getFeatureConfig';

export class Telemetry extends ToggleFeature {
	public static override async create() {
		return new Telemetry(await getFeatureConfig('telemetry'));
	}

	override isAvailable() {
		return telemetryEnabled;
	}

	override getCacheItem() {
		return telemetryOptIn;
	}
}
