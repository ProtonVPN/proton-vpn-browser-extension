import {storage} from '../../tools/storage';
import {ToggleFeature} from './ToggleFeature';
import {getFeatureConfig} from './getFeatureConfig';

export const storedRecents = storage.item<{value: boolean}>('recents');

export class Recents extends ToggleFeature {
	public static override async create() {
		return new Recents(await getFeatureConfig('recents'));
	}

	override getDefault() {
		return {value: this.isAvailable()};
	}

	getCacheItem() {
		return storedRecents;
	}
}
