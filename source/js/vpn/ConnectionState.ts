/// <reference types="firefox-webext-browser"/>
import type {ProxyInfo} from './proxy/ProxyInfo';
import type {ProxyAuthentication} from './proxy/ProxyAuthentication';
import type {ApiError} from '../api/ApiError';
import type {SettingChange} from '../messaging/MessageType';
import type {Credentials} from '../account/credentials/Credentials';
import type {SplitTunnelingMode} from './WebsiteFilter';
import type {Coordinates} from '../tools/Coordinates';
import OnAuthRequiredDetails = chrome.webRequest.OnAuthRequiredDetails;
import OnRequestDetails = browser.proxy._OnRequestDetails;

/* c8 ignore start */

export interface ServerSummary {
	id: string | number;
	name: string;
	entryCountry?: string;
	exitIp: string;
	exitCountry: string;
	exitCity: string | null | undefined;
	exitEnglishCity: string | null | undefined;
	/** Approximate exit location, used to guess the server timezone */
	exitLocation?: Coordinates;
	secureCore: boolean | undefined;
}

export interface SplitTunnelingConfig {
	mode?: SplitTunnelingMode;
	filteredDomains?: string[];
}

export interface ProxyServer extends ServerSummary {
	proxyHost: string;
	proxyPort: number;
	splitTunneling?: SplitTunnelingConfig;
}

export interface StateDefinition {
	name: string;
	proxyEnabled?: boolean;
	init?(oldState?: ConnectionState): void;
	refreshState?(): void;
	checkConnectingState?(time: number): void;
	setCredentials?(credentials: Credentials | undefined): void;
	connectCurrentServer?(): Promise<boolean>;
	handleProxyRequest?(
		requestInfo: OnRequestDetails,
	): ProxyInfo | null | Promise<ProxyInfo>;
	handleProxyAuthentication?(
		requestInfo: OnAuthRequiredDetails,
	): Promise<ProxyAuthentication | undefined>;
	setOption?(type: SettingChange, data: unknown): void | Promise<void>;
}

export interface ErrorDump {
	message: string;
	stack?: string;
}

export interface ConnectionState extends StateDefinition {
	initializedAt: number;
	data: {
		error?: ApiError | Error | ErrorDump;
		server?: ProxyServer;
		credsTry?: number;
		credsData?: {
			Username: string;
			Password: string;
		};
		starting?: boolean;
	};
}

export type ConnectionStateSwitch = StateDefinition & Partial<ConnectionState>;

/* c8 ignore stop */

/**
 * Type guard to ensure contextual type compliance while still allowing custom properties and their type inference.
 */
export function asConnectionStateSwitch<T extends Record<string, unknown>>(
	value: T & ConnectionStateSwitch,
): T & ConnectionStateSwitch {
	return value;
}
