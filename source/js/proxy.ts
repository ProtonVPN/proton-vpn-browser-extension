import WebAuthChallenger = chrome.webRequest.WebAuthChallenger;
import ResourceRequest = chrome.webRequest.ResourceRequest;

export interface ProxyInfo {
	type: 'direct' | 'https' | 'http';
	host?: string;
	port?: number | string;
	username?: string;
	password?: string;
	proxyAuthorizationHeader?: string;
}

export interface RequestDetails extends ResourceRequest {
	challenger: WebAuthChallenger;
	cookieStoreId: string;
	documentId?: string;
	documentLifecycle?: string;
	frameType?: string;
	fromCache?: boolean
	parentDocumentId?: string;
	documentUrl: string | undefined;
	error?: string;
	incognito: boolean;
	ip: string;
	isProxy?: boolean;
	method: string;
	originUrl: string | undefined;
	proxyInfo: {
		connectionIsolationKey: string | null;
		failoverTimeout: number;
		host: string;
		port: number;
		proxyAuthorizationHeader?: string;
		type: string;
		username?: string;
		password?: string;
	};
	realm: string; // 'Authentication required'
	requestSize: number;
	responseSize: number;
	scheme: string;
	statusCode: number;
	statusLine: string; // 'HTTP/1.1 407 Proxy Authentication Required'
	thirdParty: boolean;
}
