import type {WebsiteFilter} from './WebsiteFilter';

export const getDomainFilterList = (websites: WebsiteFilter[]): string[] => {
	const domainList: string[] = [];

	websites.forEach(exclusion => {
		domainList.push(
			exclusion.domain,
			...(exclusion.withSubDomains ? ['.' + exclusion.domain] : []),
		);
	});

	return domainList;
};
