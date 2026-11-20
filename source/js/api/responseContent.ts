import type {DataResult, ResponseResult} from './ApiError';
import {checkIfResponseWasBlocked} from './blockingSoftware';
import {c} from '../tools/translate';
import {warn} from '../log/log';

/**
 * Get response as JSON if possible, else return generic error.
 *
 * Note: most of the error should not trigger this because this function is called when
 * HTTP status is 200, so well-formed JSON is expected.
 */
const getJsonContent = async <T extends ResponseResult = ResponseResult>(
	response: Response,
): Promise<T> => {
	try {
		const clone = response.clone();
		const type = response.headers.get('Content-Type');

		return await (type === 'application/octet-stream'
			? clone.arrayBuffer()
			: clone.json());
	} catch (e) {
		await checkIfResponseWasBlocked(response);

		warn(response.status, e);

		throw new Error(c('Error').t`Service temporarily unavailable`, {
			cause: e,
		});
	}
};

export const buildResponseResult = async <T, D>(
	response: Response,
	resultBuilder?: (response: Response, data: D) => T,
): Promise<T> => {
	const data = await getJsonContent(response);

	return resultBuilder ? resultBuilder(response, data as D) : (data as T);
};

/**
 * Get response as JSON if possible, or else as text, to be used for unexpected output
 * such as API error responses that may or may not contain JSON.
 */
export const getResponseContent = async <T extends DataResult = DataResult>(
	response: Response,
): Promise<T | string> => {
	try {
		return await response.clone().json();
	} catch {
		return await checkIfResponseWasBlocked(response);
	}
};
