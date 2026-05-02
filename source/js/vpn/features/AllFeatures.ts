import type {SecureCore} from './SecureCore';
import type {Notification} from './Notification';
import type {AutoConnect} from './AutoConnect';
import type {PreventWebrtcLeak} from './PreventWebrtcLeak';
import type {Telemetry} from './Telemetry';
import type {CrashReports} from './CrashReports';
import type {SplitTunneling} from './SplitTunneling';
import type {Recents} from './Recents';
import type {LoadedFeature} from './loadAllFeatures';

export interface AllFeatures {
	secureCore: LoadedFeature<SecureCore>;
	notification: LoadedFeature<Notification>;
	autoConnect: LoadedFeature<AutoConnect>;
	preventWebrtcLeak: LoadedFeature<PreventWebrtcLeak>;
	telemetry: LoadedFeature<Telemetry>;
	crashReport: LoadedFeature<CrashReports>;
	splitTunneling: LoadedFeature<SplitTunneling>;
	recents: LoadedFeature<Recents>;
}
