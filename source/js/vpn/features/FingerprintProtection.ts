import {fingerprintProtectionEnabled} from '../../config';
import type {FingerprintGroup} from '../../fingerprint/FingerprintGroup';
import {
	fingerprintGroups,
	getFingerprintGroupKey,
} from '../../fingerprint/FingerprintGroup';
import {isFingerprintOptionsEnabled} from '../../fingerprint/isFingerprintOptionsEnabled';
import {isFingerprintProtectionSupported} from '../../fingerprint/isFingerprintProtectionSupported';
import {storedFingerprintToggles} from '../../fingerprint/storedFingerprintSettings';
import type {FeatureConfig} from './getFeatureConfig';
import {getFeatureConfig} from './getFeatureConfig';
import type {LoadedFeature} from './loadAllFeatures';
import type {Toggle} from './Toggle';
import {ToggleFeature} from './ToggleFeature';

/**
 * One toggle per fingerprint group (off by default), each can be locked by
 * managed config like other features, e.g. {"spoof-timezone": {
 * "controllable": false, "config": {"value": true}}}
 */
export class FingerprintProtection extends ToggleFeature {
	protected constructor(
		config: FeatureConfig<Toggle>,
		public readonly group: FingerprintGroup,
	) {
		super(config);
	}

	public static async createFor(group: FingerprintGroup) {
		return new FingerprintProtection(
			await getFeatureConfig(getFingerprintGroupKey(group)),
			group,
		);
	}

	override isAvailable() {
		return fingerprintProtectionEnabled;
	}

	override getCacheItem() {
		return storedFingerprintToggles[this.group];
	}
}

export type FingerprintFeatures = Record<
	FingerprintGroup,
	LoadedFeature<FingerprintProtection>
>;

export const loadFingerprintFeatures = async (): Promise<FingerprintFeatures> =>
	Object.fromEntries(
		await Promise.all(
			fingerprintGroups.map(async (group) => {
				const feature = await FingerprintProtection.createFor(group);

				return [group, {feature, config: await feature.getConfig()}];
			}),
		),
	) as FingerprintFeatures;

export const getEnabledFingerprintGroups = async (): Promise<
	FingerprintGroup[]
> => {
	// Even when forced on by managed config: without page scripts, only the
	// headers would be spoofed, the mismatch would make the browser stand out
	if (
		!isFingerprintProtectionSupported() ||
		!(await isFingerprintOptionsEnabled())
	) {
		return [];
	}

	const features = await loadFingerprintFeatures();

	return fingerprintGroups.filter((group) => features[group].config.value);
};
