import {fingerprintProtectionEnabled} from '../config';
import {getFeatureFlag} from '../featureFlag/getFeatureFlag';

/**
 * Fingerprint protection page (and its entry on the features page), also
 * required to apply any spoofing: if the flag gets turned off, options
 * stored as on must not stay applied while the user can't reach them.
 */
export const isFingerprintOptionsEnabled = async (): Promise<boolean> => {
	if (!fingerprintProtectionEnabled) {
		return false;
	}

	try {
		return await getFeatureFlag('AntiFingerprintOptions');
	} catch {
		return false;
	}
};
