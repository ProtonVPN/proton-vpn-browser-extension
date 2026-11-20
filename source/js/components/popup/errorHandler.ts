'use popup';
import {configureCallbackOnce} from '../../tools/configureCallbackOnce';
import type {ApiError} from '../../api/ApiError';
import type {ErrorDump} from '../../vpn/ConnectionState';

export const getErrorHandler = () => {
	let lastError: ApiError | Error | ErrorDump | undefined = undefined;

	const configurator = configureCallbackOnce(
		'setError',
		(error: ApiError | Error | ErrorDump | undefined) => {
			lastError = error;
		},
	);

	return {
		setError: configurator.callback,
		configureErrorHandler(
			handler: (error: ApiError | Error | ErrorDump | undefined) => void,
		) {
			configurator.set(handler);

			if (lastError) {
				handler(lastError);
			}
		},
	};
};
