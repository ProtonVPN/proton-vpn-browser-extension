import {ProxyInfo, RequestDetails} from '../proxy';
import {ProxyAuthentication} from './ProxyAuthentication';
import {ApiError} from '../api';
import {SettingChange} from '../messaging/MessageType';
import {Credentials} from '../account/credentials/Credentials';

export interface ServerSummary {
	id: string | number;
	name: string;
	entryCountry?: string;
	exitIp: string;
	exitCountry: string;
	exitCity: string | null | undefined;
	exitEnglishCity: string | null | undefined;
	secureCore: boolean | undefined;
}

export interface ProxyServer extends ServerSummary {
	proxyHost: string;
	proxyPort: number;
	bypassList?: string[];
}

export interface StateDefinition {
	name: string;
	proxyEnabled?: boolean;
	init?(oldState?: ConnectionState): void;
	refreshState?(): void;
	checkConnectingState?(time: number): void;
	setCredentials?(credentials: Credentials | undefined): void;
	connectCurrentServer?(): Promise<boolean>;
	handleProxyRequest?(requestInfo: RequestDetails): ProxyInfo | Promise<ProxyInfo>;
	handleProxyAuthentication?(requestInfo: RequestDetails): Promise<ProxyAuthentication | undefined>;
	setOption?(type: SettingChange, data: any): void | Promise<void>;
}

export interface ConnectionState extends StateDefinition {
	initializedAt: number;
	data: {
		error?: ApiError | Error;
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
