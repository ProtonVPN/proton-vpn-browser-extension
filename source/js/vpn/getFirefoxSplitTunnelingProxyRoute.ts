import {apiDomainsExclusion} from '../config';
import {matchDomainList} from '../tools/matchDomainList';
import type {SplitTunnelingConfig} from './ConnectionState';
import {
	type FirefoxInheritedRoute,
	type FirefoxSplitTunnelingFrameContext,
} from './FirefoxSplitTunnelingFrameContext';
import {SplitTunnelingMode} from './WebsiteFilter';
import OnRequestDetails = browser.proxy._OnRequestDetails;

export type FirefoxSplitTunnelingProxyRoute = 'proxy' | 'direct';

export interface FirefoxSplitTunnelingProxyRouteOptions {
	apiExclusion: boolean;
	hardDirectDomains: string[];
	includeOnlyDomains: string[] | undefined;
	splitTunneling: SplitTunnelingConfig | undefined;
	splitTunnelingDomains: string[];
	frameContext: FirefoxSplitTunnelingFrameContext;
}

const canParseCandidateUrl = (candidateUrl: string | undefined): boolean => {
	if (!candidateUrl) {
		return true;
	}

	try {
		new URL(candidateUrl);

		return true;
	} catch {
		return false;
	}
};

const canUseInheritance = (requestInfo: OnRequestDetails): boolean =>
	requestInfo.tabId !== -1 &&
	requestInfo.type !== 'speculative' &&
	canParseCandidateUrl(requestInfo.documentUrl) &&
	canParseCandidateUrl(requestInfo.originUrl);

const matchDomainUrl = (
	domains: string[],
	candidateUrl: string | undefined,
): boolean => {
	if (!candidateUrl) {
		return false;
	}

	try {
		return matchDomainList(
			domains,
			{
				url: candidateUrl,
			} as OnRequestDetails,
			new URL(candidateUrl).hostname,
		);
	} catch {
		return false;
	}
};

const isUrlExcluded = (url: URL, apiExclusion: boolean) =>
	apiDomainsExclusion.includes(url.hostname) &&
	(apiExclusion || /^\/?(api\/)?vpn\/location(\?.*)?$/.test(url.pathname));

const isHardDirectRequest = (
	requestInfo: OnRequestDetails,
	apiExclusion: boolean,
	hardDirectDomains: string[],
): boolean =>
	isUrlExcluded(new URL(requestInfo.url), apiExclusion) ||
	matchDomainUrl(hardDirectDomains, requestInfo.url);

const matchesInitiator = (
	domains: string[],
	requestInfo: OnRequestDetails,
): boolean =>
	[requestInfo.documentUrl, requestInfo.originUrl].some(
		(candidateUrl) => matchDomainUrl(domains, candidateUrl),
	);

const getInheritedRoute = (
	requestInfo: OnRequestDetails,
	frameContext: FirefoxSplitTunnelingFrameContext,
): FirefoxInheritedRoute | undefined =>
	frameContext.getInheritedRoute(
		requestInfo.tabId,
		requestInfo.frameId,
		requestInfo.parentFrameId,
	);

const updateFrameContext = (
	requestInfo: OnRequestDetails,
	frameContext: FirefoxSplitTunnelingFrameContext,
	specialRoute: FirefoxInheritedRoute | undefined,
): void => {
	if (
		requestInfo.tabId === -1 ||
		(requestInfo.type !== 'main_frame' && requestInfo.type !== 'sub_frame')
	) {
		return;
	}

	frameContext.replaceFrameRoute(
		requestInfo.tabId,
		requestInfo.frameId,
		requestInfo.parentFrameId,
		specialRoute,
	);
};

export const getFirefoxSplitTunnelingProxyRoute = (
	requestInfo: OnRequestDetails,
	{
		apiExclusion,
		hardDirectDomains,
		includeOnlyDomains,
		splitTunneling,
		splitTunnelingDomains,
		frameContext,
	}: FirefoxSplitTunnelingProxyRouteOptions,
): FirefoxSplitTunnelingProxyRoute => {
	if (isHardDirectRequest(requestInfo, apiExclusion, hardDirectDomains)) {
		updateFrameContext(requestInfo, frameContext, undefined);

		return 'direct';
	}

	const inheritanceEnabled = canUseInheritance(requestInfo);
	const inheritedRoute = inheritanceEnabled
		? getInheritedRoute(requestInfo, frameContext)
		: undefined;

	if (splitTunneling?.mode === SplitTunnelingMode.Include) {
		const shouldProxy =
			!!includeOnlyDomains &&
			(matchDomainUrl(includeOnlyDomains, requestInfo.url) ||
				(inheritanceEnabled &&
					(matchesInitiator(includeOnlyDomains, requestInfo) ||
						inheritedRoute === 'proxy')));

		updateFrameContext(
			requestInfo,
			frameContext,
			inheritanceEnabled && shouldProxy ? 'proxy' : undefined,
		);

		return shouldProxy ? 'proxy' : 'direct';
	}

	const shouldDirect =
		matchDomainUrl(splitTunnelingDomains, requestInfo.url) ||
		(inheritanceEnabled &&
			(matchesInitiator(splitTunnelingDomains, requestInfo) ||
				inheritedRoute === 'direct'));

	updateFrameContext(
		requestInfo,
		frameContext,
		inheritanceEnabled && shouldDirect ? 'direct' : undefined,
	);

	return shouldDirect ? 'direct' : 'proxy';
};
