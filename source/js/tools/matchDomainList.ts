import {isHostMatchedByIpMask} from './ip';
import OnRequestDetails = browser.proxy._OnRequestDetails;

/**
 * Return true when the domain of a request matches one of the domainList.
 *
 * For example: a request to foo.bar.com matches the list [*.biz.com, *.bar.com]
 */
export const matchDomainList = (
	domainList: string[],
	requestInfo: OnRequestDetails,
	callHostname: string,
) => domainList.some(domain => {
	if (domain.startsWith('.')) {
		return (new RegExp(
			domain.replace('.', '\\.') + '$'
		)).test(callHostname);
	}

	if (isHostMatchedByIpMask(callHostname, domain)) {
		return true;
	}

	if (/[*\\/]/.test(domain)) {
		if (domain.includes('/')) {
			return (new RegExp(
				'^' +
				(domain.includes('//') ? '([^/]+\.)?' : '') +
				domain
					.replace('.', '\\.')
					.replace('*', '.*')
			)).test(domain.startsWith('://')
				? requestInfo.url.replace(/^[a-z]+(:\/\/)/, '$1')
				: (domain.startsWith('//')
						? requestInfo.url.replace(/^[a-z]+:(\/\/)/, '$1')
						: requestInfo.url
				)
			);
		}

		return (new RegExp(
			domain
				.replace('.', '\\.')
				.replace('*', '.*') + '$'
		)).test(callHostname);
	}

	return callHostname === domain;
});
