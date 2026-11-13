import {baseAPIURL} from '../config';
import {milliSeconds} from './milliSeconds';
import {hasSession} from '../account/readSession';
import {isGitHubReachable} from '../vpn/detectCensorship';

/**
 * Proton API domains are always excluded from the proxy (`excludeApiFromProxy`)
 * in both Chrome (bypassList) and Firefox (proxy.onRequest), so this request
 * goes directly through the device network, whether the VPN is connected or
 * not, and it doesn't send anything to a host the extension doesn't already
 * contact directly.
 *
 * So a network failure here means the device itself has no working internet
 * access, it cannot be caused by the VPN server or the proxy.
 */
export const connectivityProbeURL = `${baseAPIURL}tests/ping`;

/**
 * @return true if any HTTP response (whatever the status) was received
 *         or if we suspect that only Proton is blocked (like censorship situation),
 *         false on network error, timeout (except the cases where censorship is likely).
 */
export const probeConnectivity = async (
	fetchFunction: typeof fetch = fetch,
	timeout = milliSeconds.fromSeconds(5),
): Promise<boolean> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);

	try {
		await fetchFunction(connectivityProbeURL, {
			method: 'GET',
			cache: 'no-store',
			credentials: 'omit',
			signal: controller.signal,
		});

		return true;
	} catch {
		// If user had a session before, censorship case is unlikely,
		// offline is probably the cause of the failure
		if (await hasSession()) {
			return false;
		}

		// If GitHub appear reachable over the last 5 minutes, and the user is not logged in,
		// then it's more likely a case of censorship, rather than offline,
		// so better say nothing than a possibly misleading offline message
		return await isGitHubReachable(milliSeconds.fromMinutes(5));
	} finally {
		clearTimeout(timer);
	}
};
