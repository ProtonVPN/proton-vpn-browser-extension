// @ts-ignore
import * as baseConfig from '../../config';

const accountSuffix = '';

export const appVersion = baseConfig.appVersion;
export const getFullAppVersion = () => 'browser-vpn@' + appVersion;
export const appId = baseConfig.appId;
export const baseDomainURL = baseConfig.baseDomainURL;
export const accountURL = `${baseDomainURL}/${accountSuffix}`;
export const manageAccountURL = `${accountURL}vpn/dashboard`;
export const baseAPIURL = `${baseDomainURL}/api/`;

export const hostname = new URL(baseAPIURL).hostname;

export const excludeApiFromProxy = true;

export const sentryDsn = baseConfig.sentry;

export const apiDomainsExclusion = [
	hostname,
	...baseConfig.apiDomainsExclusion,
];

export const proxyLocalNetworkExclusion = baseConfig.proxyLocalNetworkExclusion;

export const signupEnabled = baseConfig.signupEnabled;

export const torEnabled = baseConfig.torEnabled;

export const incompatibleSoftware = baseConfig.incompatibleSoftware;

export const tokenDuration = baseConfig.tokenDuration; // seconds

export const requestMaxAge = Math.floor(tokenDuration / 4); // seconds

export const proxyHost = baseConfig.proxyHost;

export const proxyPort = baseConfig.proxyPort;

export const singleProxyPort = baseConfig.singleProxyPort;

export const proxySecureCorePort = baseConfig.proxySecureCorePort;

export const telemetryEnabled = true;

export const scheme = baseConfig.scheme;

export const authCheck = false;

export const splitTunnelingEnabled = true;

export const secureCoreEnabled = true;

export const autoConnectEnabled = true;

export const secureCoreQuickButtonEnabled = false;

export const paidOnly = false;

export const debug = true;

export const simplifiedUi = true;
