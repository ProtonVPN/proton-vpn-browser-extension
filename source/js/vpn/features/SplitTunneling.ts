import {splitTunnelingEnabled} from '../../config';
import {storedSplitTunneling} from '../storedSplitTunneling';
import {c} from '../../tools/translate';
import {FeatureWrapper} from './FeatureWrapper';
import {getFeatureConfig} from './getFeatureConfig';
import type {StoredWebsiteFilterList} from '../WebsiteFilter';
import type {LocallyStoredFeature} from './LocallyStoredFeature';

export class SplitTunneling
	extends FeatureWrapper<StoredWebsiteFilterList>
	implements LocallyStoredFeature<StoredWebsiteFilterList>
{
	public static override async create() {
		return new SplitTunneling(await getFeatureConfig('split-tunneling'));
	}

	override isAvailable(): boolean {
		return splitTunnelingEnabled;
	}

	override getDefaultControlMessage(): string {
		return c('Info')
			.t`The split tunneling options cannot be changed on this device`;
	}

	getDefault(): StoredWebsiteFilterList {
		return {value: []};
	}

	getCacheItem() {
		return storedSplitTunneling;
	}

	override getUserConfig() {
		return this.getCacheItem().get();
	}
}
