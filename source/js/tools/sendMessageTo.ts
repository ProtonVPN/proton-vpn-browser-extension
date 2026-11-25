import {getRuntime} from './getRuntime';
import {deserializeError} from '../messaging/errorSerialization';

const runtime = getRuntime();

/**
 * Unified message sender.
 *
 * Resolves with the `result` the listener answered with, or rejects with
 * its `error` (unless it's only a warning) or if the message can't be sent.
 */
export const sendMessageTo = async <K>(
	type: string,
	data: unknown = undefined,
): Promise<K> => {
	const response = await runtime.sendMessage(runtime.id, {
		type,
		data,
	});

	if (!response) {
		return response;
	}

	const result = response?.result;
	const error = result?.error;

	if (error && !error.Warning) {
		throw deserializeError(error);
	}

	return result;
};
