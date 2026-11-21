import type {
	ApiError,
	DeviceLimitErrorDetails,
	ForbiddenError,
	InvalidTokenError,
	NotFoundError,
	UnauthorizedError,
} from './ApiError';

export const isObject = (value: unknown) =>
	typeof value === 'object' && value !== null;

export const isSuccessfulResponse = (response: Response): boolean =>
	response.status >= 200 && response.status < 300;

export const isNetworkError = (error: unknown): boolean =>
	isObject(error) &&
	((error as {name?: string}).name === 'NetworkError' ||
		// fetchApi() request timeout
		(error as {name?: string}).name === 'TimeoutError' ||
		/^(NetworkError |(TypeError: )?Failed to fetch)/.test(
			(error as {message?: string}).message || '',
		));

/**
 * Network failure, either raw (failed fetch) or as the "Network is unreachable"
 * error the background stores in its state (see checkNetwork, `Code: -1`).
 */
export const isNetworkUnreachableError = (error: unknown): boolean =>
	isNetworkError(error) ||
	(isObject(error) && (error as {Code?: number}).Code === -1);

export const hasErrorHttpStatus = (
	error: unknown,
	httpStatus: number,
): error is ApiError =>
	isObject(error) && (error as {httpStatus?: number}).httpStatus === httpStatus;

export const isNotModified = (
	response: unknown,
): response is ApiError<unknown, 304, number> | {status: 304} =>
	(response as {status?: number})?.status === 304 ||
	hasErrorHttpStatus(response, 304);

export const isNotFoundError = (error: unknown): error is NotFoundError =>
	hasErrorHttpStatus(error, 404);

export const isUnauthorizedError = (
	error: unknown,
): error is UnauthorizedError => hasErrorHttpStatus(error, 401);

export const isInvalidTokenError = (
	error: unknown,
): error is InvalidTokenError =>
	isUnauthorizedError(error) && error.Code === 401;

export const isForbiddenError = (error: unknown): error is ForbiddenError =>
	hasErrorHttpStatus(error, 403);

export const isDeviceLimitError = (
	error: unknown,
): error is ApiError<DeviceLimitErrorDetails> =>
	((error as ApiError)?.Details as {Type?: string})?.Type === 'DeviceLimit';

export const needsLogout = (error: unknown): error is ApiError =>
	isObject(error) &&
	((error as {Code?: number}).Code === 2028 ||
		(error as {Code?: number}).Code === 2027);

export const needsUpdate = (error: unknown): error is ApiError =>
	isObject(error) && (error as {Code?: number}).Code === 5003;

export const isRetriableResponse = (response: Response): boolean =>
	response.status === 429;

export const isRetriableError = (error: unknown): error is ApiError =>
	isObject(error) &&
	((error as {Code?: number}).Code === 429 ||
		(error as {Code?: number}).Code === 503);
