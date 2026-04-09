import {FeatureWrapper} from './FeatureWrapper';
import type {Toggle} from './Toggle';
import type {LocallyStoredFeature} from './LocallyStoredFeature';
import type {CacheItem} from '../../tools/storage';

export abstract class ToggleFeature
	extends FeatureWrapper<Toggle>
	implements LocallyStoredFeature<Toggle>
{
	getDefault() {
		return {value: false};
	}

	abstract getCacheItem(): CacheItem<Toggle>;

	override getUserConfig() {
		return this.getCacheItem().get();
	}
}
