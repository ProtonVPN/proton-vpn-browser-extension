export enum StateChange {
	SIGN_OUT = 'signOut',
	/** Session no longer usable (e.g. invalid refresh token), sign out without revoking it */
	SESSION_EXPIRED = 'sessionExpired',
	SWITCH_ACCOUNT = 'switchAccount',
	DISCONNECT = 'disconnect',
	CONNECT = 'connect',
	CONNECTING = 'connecting',
}

export enum SettingChange {
	BYPASS_LIST = 'bypassList',
}

export enum PermissionGrant {
	PROXY = 'proxy',
}

export enum BackgroundAction {
	FORK = 'fork',
	FORGET_ERROR = 'forgetError',
	LOG = 'log',
	PROMOTION_DISPLAY = 'promotionDisplay',
	OPEN_PROMOTION = 'openPromotion',
	/** Refresh the session tokens, see RefreshTokenData */
	REFRESH_TOKEN = 'refreshToken',
	/** Respond once the token refresh in progress (if any) settles */
	WAIT_FOR_REFRESH = 'waitForRefresh',
}

export enum BackgroundData {
	USER = 'user',
	PM_USER = 'pmUser',
	STATE = 'state',
	LOCALE = 'locale',
}

export type BackgroundExtraData = {
	[BackgroundData.PM_USER]: object;
	[StateChange.SESSION_EXPIRED]: SessionExpiredData;
	[BackgroundAction.REFRESH_TOKEN]: RefreshTokenData;
};

export type RefreshTokenData = {
	/**
	 * Fingerprint of the refresh token of the session the rejected request
	 * was sent with: if the stored session no longer uses it, tokens were
	 * already rotated and no refresh happens.
	 */
	refreshTokenFingerprint?: string;
};

export type SessionExpiredData = {
	/** Fingerprint of the rejected refresh token, see getRefreshTokenFingerprint() */
	refreshTokenFingerprint?: string;
};

export type BackgroundMessage =
	| BackgroundAction
	| BackgroundData
	| StateChange
	| SettingChange
	| PermissionGrant;
