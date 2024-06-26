import {WebsiteExclusion} from './WebsiteExclusion';

export const getBypassList = (userTier: number, exclusions: WebsiteExclusion[]): string[] => {
	if (userTier < 1) {
		return [];
	}

	const bypassList: string[] = [];

	exclusions.forEach(exclusion => {
		bypassList.push(
			exclusion.domain,
			...(exclusion.withSubDomains ? ['.' + exclusion.domain] : []),
		);
	});

	return bypassList;
};
