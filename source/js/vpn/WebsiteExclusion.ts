export interface WebsiteExclusion {
	domain: string;
	withSubDomains: boolean;
}

export interface StoredWebsiteExclusionList {
	value: WebsiteExclusion[];
}
