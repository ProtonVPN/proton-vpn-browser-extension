import {secureCoreEnabled} from '../../config';
import {storedSecureCore} from '../storedSecureCore';
import {ToggleFeature} from './ToggleFeature';
import {getFeatureConfig} from './getFeatureConfig';

export class SecureCore extends ToggleFeature {
	public static override async create() {
		return new SecureCore(await getFeatureConfig('secure-core'));
	}

	override isAvailable() {
		return secureCoreEnabled;
	}

	override getCacheItem() {
		return storedSecureCore;
	}
}
