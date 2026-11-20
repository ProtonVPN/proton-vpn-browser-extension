export enum ErrorActionCode {
	UPGRADE = 'Upgrade',
	SIGN_OUT = 'SignOut',
	REFRESH = 'Refresh',
}

export enum ErrorActionCategory {
	MAIN_ACTION = 'main_action',
	SECONDARY_ACTION = 'secondary_action',
	LINK = 'link',
}

export interface ErrorAction {
	Code: ErrorActionCode;
	Category: ErrorActionCategory;
	Name: string;
	URL: string;
}

export interface DeviceLimitErrorDetails {
	Type: 'DeviceLimit';
	Title?: string;
	Body?:
		| string
		| Array<{
				Component: string;
				Icon: string;
				Text: string;
		  }>;
	Hint?: string;
	Actions?: ErrorAction[];
}

export type DataResult = Record<string, unknown>;

export interface ApiError<
	T = DataResult | DeviceLimitErrorDetails,
	S extends number = number,
	C extends number = number,
> {
	httpStatus: S;
	Code: C;
	Error: string;
	Details?: T;
	Warning?: boolean;
	_id?: string;
}

export type UnauthorizedError<
	T = DataResult,
	C extends number = number,
> = ApiError<T, 401, C>;

export type ForbiddenError<
	T = DataResult,
	C extends number = number,
> = ApiError<T, 403, C>;

export type NotFoundError<T = DataResult, C extends number = number> = ApiError<
	T,
	404,
	C
>;

export type InvalidTokenError<T = DataResult> = UnauthorizedError<T, 401>;

export type ResponseResult = DataResult | ArrayBuffer;

export type WithResponse = {response?: Response};
