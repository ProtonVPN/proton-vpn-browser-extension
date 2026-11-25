import {storedKillSwitch} from '../storedKillSwitch';
import {ToggleFeature} from './ToggleFeature';
import {getFeatureConfig} from './getFeatureConfig';

/** Block traffic instead of going direct when the connection fails, off by default */
export class KillSwitch extends ToggleFeature {
	public static override async create() {
		return new KillSwitch(await getFeatureConfig('kill-switch'));
	}

	override getCacheItem() {
		return storedKillSwitch;
	}
}

export const isKillSwitchEnabled = async (): Promise<boolean> =>
	!!(await (await KillSwitch.create()).getConfig())?.value;
