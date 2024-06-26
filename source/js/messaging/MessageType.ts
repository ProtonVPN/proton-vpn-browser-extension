export enum StateChange {
	SIGN_OUT = 'signOut',
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
}

export enum BackgroundData {
	USER = 'user',
	PM_USER = 'pmUser',
	STATE = 'state',
}

export type BackgroundMessage =
	| BackgroundAction
	| BackgroundData
	| StateChange
	| SettingChange
	| PermissionGrant;
