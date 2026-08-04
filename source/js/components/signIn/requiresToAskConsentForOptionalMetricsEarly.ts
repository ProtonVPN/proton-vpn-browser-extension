import {getBrowser} from '../../tools/getBrowser';
import {CrashReports} from '../../vpn/features/CrashReports';

export const requiresToAskConsentForOptionalMetricsEarly =
	async (): Promise<boolean> => {
		if (getBrowser().type !== 'firefox') {
			return false;
		}

		const crashReportsFeature = await CrashReports.create();

		// Decided by the MDM system (computer admin)
		if (!crashReportsFeature.isControllable()) {
			return false;
		}

		const crashReports = await crashReportsFeature.getCacheItem().get();

		return typeof crashReports === 'undefined';
	};
