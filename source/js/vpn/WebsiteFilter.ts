export interface WebsiteFilter {
	domain: string;
	withSubDomains: boolean;
	mode?: SplitTunnelingMode;
}

export enum SplitTunnelingMode {
	Include = 'include',
	Exclude = 'exclude',
}

/**
 * Represents stored website filter list data as it might exist in storage.
 * Properties may be missing due to old versions, corrupted data, or new users.
 */
export interface StoredWebsiteFilterList {
	enabled?: boolean;
	value: WebsiteFilter[];
	mode?: SplitTunnelingMode;
}

/**
 * Represents a fully initialized website filter list with all required properties.
 * After passing through SplitTunnelingDomainManager constructor, all fields are guaranteed to be set.
 */
export type WebsiteFilterList = Required<StoredWebsiteFilterList>;
