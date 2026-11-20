/// <reference types="firefox-webext-browser"/>
import {apiDomainsExclusion} from '../../config';
import {matchDomainList} from '../../tools/matchDomainList';
import OnRequestDetails = browser.proxy._OnRequestDetails;

const isUrlExcluded = (url: URL, apiExclusion: boolean) =>
	apiDomainsExclusion.includes(url.hostname) &&
	(apiExclusion || /^\/?(api\/)?vpn\/location(\?.*)?$/.test(url.pathname));

/** True for requests to the Proton API (which never goes through the proxy) */
export const isApiRequest = (requestInfo: OnRequestDetails): boolean => {
	try {
		return isUrlExcluded(new URL(requestInfo.url), true);
	} catch {
		return false;
	}
};

export const isExcludedFromProxy = (
	requestInfo: OnRequestDetails,
	apiExclusion: boolean,
	bypassList?: string[] | undefined,
): boolean => {
	const url = new URL(requestInfo.url);

	if (isUrlExcluded(url, apiExclusion)) {
		return true;
	}

	return matchDomainList(bypassList || [], requestInfo, url.hostname);
};

export const isIncludedIntoProxy = (
	requestInfo: OnRequestDetails,
	apiExclusion: boolean,
	includeOnlyList?: string[] | undefined,
): boolean => {
	const url = new URL(requestInfo.url);

	if (isUrlExcluded(url, apiExclusion)) {
		return false;
	}

	if (typeof includeOnlyList === 'undefined') {
		return true;
	}

	return matchDomainList(includeOnlyList, requestInfo, url.hostname);
};
