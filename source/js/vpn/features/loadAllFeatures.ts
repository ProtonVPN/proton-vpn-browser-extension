import {SecureCore} from './SecureCore';
import {Notification} from './Notification';
import {AutoConnect} from './AutoConnect';
import {PreventWebrtcLeak} from './PreventWebrtcLeak';
import {SplitTunneling} from './SplitTunneling';
import {Telemetry} from './Telemetry';
import {CrashReports} from './CrashReports';
import {Recents} from './Recents';
import type {FeatureWrapper} from './FeatureWrapper';
import type {AllFeatures} from './AllFeatures';

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
		recents: Recents.create(),
	};

	const [
		secureCore,
		notification,
		autoConnect,
		preventWebrtcLeak,
		telemetry,
		crashReport,
		splitTunneling,
		recents,
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
		recents,
	} as AllFeatures;
};
