import {isHostMatchedByIpMask} from './ip';
import OnRequestDetails = browser.proxy._OnRequestDetails;

const escapeDomain = (domain: string) =>
	domain.replace(/\./g, '\\.').replace(/\*/g, '.*');

/**
 * Return true when the domain of a request matches one of the domainList.
 *
 * For example: a request to foo.bar.com matches the list [*.biz.com, *.bar.com]
 */
export const matchDomainList = (
	domainList: string[],
	requestInfo: OnRequestDetails,
	callHostname: string,
) =>
	domainList.some((domain) => {
		if (domain.startsWith('.')) {
			return new RegExp(escapeDomain(domain) + '$').test(callHostname);
		}

		if (isHostMatchedByIpMask(callHostname, domain)) {
			return true;
		}

		if (/[*\\/]/.test(domain)) {
			if (domain.includes('/')) {
				return new RegExp(
					'^' +
						(domain.includes('//') ? '([^/]+\\.)?' : '') +
						escapeDomain(domain),
				).test(
					domain.startsWith('://')
						? requestInfo.url.replace(/^[a-z]+(:\/\/)/, '$1')
						: domain.startsWith('//')
							? requestInfo.url.replace(/^[a-z]+:(\/\/)/, '$1')
							: requestInfo.url,
				);
			}

			return new RegExp(escapeDomain(domain) + '$').test(callHostname);
		}

		return callHostname === domain;
	});
