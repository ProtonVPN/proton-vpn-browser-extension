import {isObject} from '../tools/isObject';
import {RefreshTokenError} from '../account/RefreshTokenError';

/**
 * Errors sent via runtime messaging are copied with JSON in Chrome (an Error
 * becomes {}) and with structured clone in Firefox (an ApiError carrying its
 * Response cannot be cloned at all). So errors are converted to a plain object
 * before replying (serializeError) and converted back on reception
 * (deserializeError), to keep their message, API fields (Code, httpStatus...)
 * and class (instanceof checks).
 */
const errorTypeKey = 'serializedErrorType';

type SerializedErrorType = 'RefreshTokenError' | 'Error';

const errorConstructors: Record<string, ErrorConstructor> = {
	TypeError,
	RangeError,
	SyntaxError,
	ReferenceError,
	EvalError,
	URIError,
};

const isUncloneable = (value: unknown): boolean =>
	typeof value === 'function' ||
	(typeof Response !== 'undefined' && value instanceof Response) ||
	(typeof Request !== 'undefined' && value instanceof Request) ||
	(typeof Headers !== 'undefined' && value instanceof Headers);

/**
 * Copy of the own enumerable properties surviving both JSON and structured
 * clone. Properties which can't be copied (e.g. the fetch Response attached
 * to API errors) are dropped.
 */
const toPlainObject = (value: object): Record<string, unknown> => {
	try {
		return JSON.parse(
			JSON.stringify(value, (key, item) =>
				key !== '' && isUncloneable(item) ? undefined : item,
			),
		);
	} catch {
		// E.g. circular structure
		return {};
	}
};

export const serializeError = (error: unknown): unknown => {
	if (error instanceof RefreshTokenError) {
		return {
			[errorTypeKey]: 'RefreshTokenError' satisfies SerializedErrorType,
			message: error.message,
			logout: error.logout,
		};
	}

	if (error instanceof Error) {
		return {
			...toPlainObject(error),
			[errorTypeKey]: 'Error' satisfies SerializedErrorType,
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	if (isObject(error)) {
		return toPlainObject(error as object);
	}

	return error;
};

export const deserializeError = (error: unknown): unknown => {
	if (!isObject(error)) {
		return error;
	}

	const {[errorTypeKey]: type, ...properties} = error as Record<
		string,
		unknown
	>;

	switch (type as SerializedErrorType | undefined) {
		case 'RefreshTokenError':
			return new RefreshTokenError(
				properties['message'] as string | undefined,
				properties['logout'] as boolean | undefined,
			);

		case 'Error': {
			const ErrorClass = errorConstructors[`${properties['name']}`] ?? Error;

			return Object.assign(
				new ErrorClass(properties['message'] as string | undefined),
				properties,
			);
		}

		default:
			return error;
	}
};
