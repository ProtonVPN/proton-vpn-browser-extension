'use popup';
import {handleError} from '../../tools/sentry';
import type {ApiError} from '../../api/ApiError';
import {storage} from '../../tools/storage';
import {getErrorMessage} from '../../tools/getErrorMessage';
import type {ErrorDump} from '../../vpn/ConnectionState';

export const transformErrorForPopup = async (
	apiError: ApiError | Error | ErrorDump | undefined,
) => {
	handleError(apiError);

	const id = (apiError as ApiError)?._id;

	return Object.assign(
		{id, blockingError: '', error: '', restartOnClose: false},
		apiError &&
			!(id && (await storage.getItem<{value: number}>('closed-' + id))?.value)
			? getErrorMessage(apiError)
			: {},
	);
};
