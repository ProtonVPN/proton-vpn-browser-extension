import {telemetryEnabled} from '../../config';
import {telemetryOptIn} from '../../tools/telemetry';
import {getBrowser} from '../../tools/getBrowser';
import {ToggleFeature} from './ToggleFeature';
import {getFeatureConfig} from './getFeatureConfig';

export class Telemetry extends ToggleFeature {
	public static override async create() {
		return new Telemetry(await getFeatureConfig('telemetry'));
	}

	override isAvailable() {
		// VPNUX-66. Telemetry is disabled on Firefox for Mozilla Add-ons compliance.
		return telemetryEnabled && getBrowser().type !== 'firefox';
	}

	override getCacheItem() {
		return telemetryOptIn;
	}
}
