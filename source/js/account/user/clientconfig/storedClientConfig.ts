import {CacheWrappedValue, Storage, storage} from '../../../tools/storage';

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
	/**
	 * Conditions to nudge the user to review us on the store.
	 * All the conditions must be met to show the modal to the user, except for [SuccessConnections OR DaysConnected]
	 * 	=> it's enough that only one of those 2 conditions is met.
	 *
	 * More information at the link above.
	 */
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

export interface RatingSettings {
	/** User must have one of the listed plans (see VPN.PlanName on /vpn/v2) such as "vpn2022" or "free" to include users without subscriptions. */
	EligiblePlans: string[];
	/** User must have at least this number of consecutive successful connections in last history. */
	SuccessConnections: number;
	/** At least this number of days must have elapsed since the user last reviewed us. */
	DaysLastReviewPassed: number;
	/** User must have been connected for at least this number of days in a row. */
	DaysConnected: number;
	/** At least this number of days must have elapsed since the first time the user connected. */
	DaysFromFirstConnection: number;
	/** At least this number of days must have elapsed since the user dismissed the review prompt. */
	DaysFromLastDismiss: number;
}

export type ClientConfigCache = CacheWrappedValue<ClientConfig>;

// We are using Storage.LOCAL to synchronize the client state between all tabs to prevent free refresh exploits. There is no point in synchronizing to different browsers where the user is signed in (Storage.SYNC).
export const clientConfigStore = storage.item<ClientConfigCache>('client-config', Storage.LOCAL);
