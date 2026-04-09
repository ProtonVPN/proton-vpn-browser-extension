import {SecureCore} from './SecureCore';
import {Notification} from './Notification';
import {AutoConnect} from './AutoConnect';
import {PreventWebrtcLeak} from './PreventWebrtcLeak';
import {SplitTunneling} from './SplitTunneling';
import {Telemetry} from './Telemetry';
import {CrashReports} from './CrashReports';
import type {FeatureWrapper} from './FeatureWrapper';

type extractGeneric<Type> = Type extends FeatureWrapper<infer X> ? X : never;

export interface LoadedFeature<Feature extends FeatureWrapper> {
	feature: Feature;
	config: extractGeneric<Feature>;
}

export const loadAllFeatures = async () => {
	const loaders = {
		secureCore: SecureCore.create(),
		notification: Notification.create(),
		autoConnect: AutoConnect.create(),
		preventWebrtcLeak: PreventWebrtcLeak.create(),
		telemetry: Telemetry.create(),
		crashReport: CrashReports.create(),
		splitTunneling: SplitTunneling.create(),
	};

	const [
		secureCore,
		notification,
		autoConnect,
		preventWebrtcLeak,
		telemetry,
		crashReport,
		splitTunneling,
	] = await Promise.all(
		Object.values(loaders).map(async (featureLoader) => {
			const feature = await featureLoader;

			return {
				feature,
				config: await feature.getConfig(),
			};
		}),
	);

	return {
		secureCore,
		notification,
		autoConnect,
		preventWebrtcLeak,
		telemetry,
		crashReport,
		splitTunneling,
	} as {
		secureCore: LoadedFeature<SecureCore>;
		notification: LoadedFeature<Notification>;
		autoConnect: LoadedFeature<AutoConnect>;
		preventWebrtcLeak: LoadedFeature<PreventWebrtcLeak>;
		telemetry: LoadedFeature<Telemetry>;
		crashReport: LoadedFeature<CrashReports>;
		splitTunneling: LoadedFeature<SplitTunneling>;
	};
};
