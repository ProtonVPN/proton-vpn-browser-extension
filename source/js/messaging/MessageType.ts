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
	RECONNECT = 'reconnect',
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
