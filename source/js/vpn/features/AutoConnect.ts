import {autoConnectEnabled} from '../../config';
import {storedAutoConnect} from '../storedAutoConnect';
import {ToggleFeature} from './ToggleFeature';
import {getFeatureConfig} from './getFeatureConfig';

export class AutoConnect extends ToggleFeature {
	public static override async create() {
		return new AutoConnect(await getFeatureConfig('auto-connect'));
	}

	override isAvailable() {
		return autoConnectEnabled;
	}

	override getDefault() {
		return {value: this.isAvailable()};
	}

	getCacheItem() {
		return storedAutoConnect;
	}
}
