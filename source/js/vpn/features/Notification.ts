import {storedNotificationsEnabled} from '../../notifications/notificationsEnabled';
import {ToggleFeature} from './ToggleFeature';
import {getFeatureConfig} from './getFeatureConfig';

export class Notification extends ToggleFeature {
	public static override async create() {
		return new Notification(await getFeatureConfig('notification'));
	}

	override getDefault() {
		return {value: true};
	}

	override getCacheItem() {
		return storedNotificationsEnabled;
	}
}
