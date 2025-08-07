import { fetchJson } from '../api';
import { getClientConfigBlockingUpdateTTL, getClientConfigTTL } from '../intervals';
import { getCacheAge } from '../tools/getCacheAge';
import { CacheWrappedValue, Storage, storage } from '../tools/storage';
import { triggerPromise } from '../tools/triggerPromise';

type ClientConfigCache = CacheWrappedValue<ClientConfig>;

let cache: ClientConfigCache | undefined = undefined;

// We are using Storage.LOCAL to synchronize the client state between all tabs to prevent free refresh exploits. There is no point in synchronizing to different browsers where the user is signed in (Storage.SYNC).
const clientConfigStore = storage.item<ClientConfigCache>('client-config', Storage.LOCAL);

const fetchClientConfig = async () => {
	const value = await fetchJson<ClientConfig>('vpn/v2/clientconfig');

	const cache = { time: Date.now(), value };
	triggerPromise(clientConfigStore.set(cache));

	return value;
};

export const getClientConfig = async () => {
	const store = await clientConfigStore.get();

	if (store && (!cache || store.time > cache.time)) {
		cache = store;
	}

	const age = getCacheAge(cache);

	// Use cache if fresh
	if (cache && age < getClientConfigTTL()) {
		return cache.value;
	}

	// Use cache but refresh in the background if it's a bit old but still good to use
	if (cache && age < getClientConfigBlockingUpdateTTL()) {
		triggerPromise(fetchClientConfig());
		return cache.value;
	}

	// Wait for the updated values from API if cache is empty or too old
	try {
		return await fetchClientConfig();
	} catch (e) {
		if (cache?.value) {
			return cache.value;
		}

		throw e;
	}
};

/** Only the portion of the state relevant to ChangeServer functionality. */
export const getChangeServerConfig = async (): Promise<ChangeServerConfig> => {
	const clientConfig = await getClientConfig();

	return {
		ChangeServerAttemptLimit: clientConfig.ChangeServerAttemptLimit,
		ChangeServerShortDelayInSeconds: clientConfig.ChangeServerShortDelayInSeconds,
		ChangeServerLongDelayInSeconds: clientConfig.ChangeServerLongDelayInSeconds,
	};
};

/**
 * As returned from the API endpoint.
 *
 * @link https://protonmail.gitlab-pages.protontech.ch/Slim-API/vpn/#tag/VPN-Config/operation/get_vpn-v2-clientconfig
 */
export interface ClientConfig extends ChangeServerConfig {
	Code: number;
	DefaultPorts: DefaultPorts;
	HolesIPs: string[];
	/**
	 * Minutes between refreshes of status of the server we're currently connected to using vpn/servers/<serverid> endpoint.
	 *
	 * This feature is not implemented yet in the extension.
	 */
	ServerRefreshInterval: number; // 40
	FeatureFlags: FeatureFlags;
	SmartProtocol: SmartProtocol;
	RatingSettings: RatingSettings;
}

export interface ChangeServerConfig {
	/** Every n-th delay is long; Limit of the number of attempts to use the [Change Server] button for free users. */
	ChangeServerAttemptLimit: number; // 4
	/** The standard delay; Minimum number of seconds before re-enabling [Change Server] button after clicking it. */
	ChangeServerShortDelayInSeconds: number; // 90
	/** Every n-th delay is long; Maximum number of seconds before re-enabling [Change Server] button after clicking it. */
	ChangeServerLongDelayInSeconds: number; // 1200
}

interface DefaultPorts {
	OpenVPN: OpenVpn;
	WireGuard: WireGuard;
}

interface OpenVpn {
	UDP: number[];
	TCP: number[];
}

interface WireGuard {
	UDP: number[];
	TCP: number[];
	TLS: number[];
}

interface FeatureFlags {
	NetShield: boolean;
	GuestHoles: boolean;
	ServerRefresh: boolean;
	StreamingServicesLogos: boolean;
	PortForwarding: boolean;
	ModerateNAT: boolean;
	PollNotificationAPI: boolean;
	VpnAccelerator: boolean;
	SmartReconnect: boolean;
	BusinessEvents: boolean;
}

interface SmartProtocol {
	OpenVPN: boolean;
	OpenVPNTCP: boolean;
	IKEv2: boolean;
	WireGuard: boolean;
	WireGuardTCP: boolean;
	WireGuardTLS: boolean;
}

interface RatingSettings {
	EligiblePlans: Record<string | number, string[]> | string[][];
	SuccessConnections: number;
	DaysLastReviewPassed: number;
	DaysConnected: number;
	DaysFromFirstConnection: number;
}
