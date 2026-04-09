import {storedPreventWebrtcLeak} from '../../webrtc/storedPreventWebrtcLeak';
import {ToggleFeature} from './ToggleFeature';
import {getFeatureConfig} from './getFeatureConfig';

export class PreventWebrtcLeak extends ToggleFeature {
	public static override async create() {
		return new PreventWebrtcLeak(await getFeatureConfig('prevent-webrtc-leak'));
	}

	override getDefault() {
		return {value: true};
	}

	override getCacheItem() {
		return storedPreventWebrtcLeak;
	}
}
