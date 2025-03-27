export interface Session {
	uid?: string;
	selectorTime?: number;
	selector?: string;
	tabOpened?: boolean;
	code?: string;
	refreshToken?: string;
	redirectURI?: string;
	accessToken?: string;
	persistent?: boolean;
	expiresAt?: number;
	partnerId?: string;
}
