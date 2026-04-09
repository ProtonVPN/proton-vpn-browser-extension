import {watchOnceBroadcastMessage} from './answering';
import {getRuntime} from './getRuntime';

const runtime = getRuntime();

export const sendMessageTo = <K>(type: string, data: any = undefined) =>
	// eslint-disable-next-line no-async-promise-executor
	new Promise<K>(async (resolve, reject) => {
		try {
			const handleResponse = (response: any) => {
				if (!response) {
					return;
				}

				const result = response?.result;
				const error = result?.error;

				if (error && !error.Warning) {
					reject(error);

					return;
				}

				const lastError = runtime?.lastError;

				if (lastError) {
					reject(lastError.message ? new Error(lastError.message) : lastError);

					return;
				}

				resolve(result);
			};

			const messagePromise = (() => {
				if (!runtime) {
					return;
				}

				try {
					const requestId = Date.now() + ':' + Math.random();
					const sender = (runtime.sendMessage as any)(
						runtime.id,
						{type, data, respondTo: 'broadcast', requestId},
						undefined,
						handleResponse,
					);

					watchOnceBroadcastMessage('answer:' + requestId, handleResponse);

					return sender;
				} catch {
					return runtime.sendMessage(runtime.id, {
						type,
						data,
						respondTo: 'promise',
					});
				}
			})();

			if (messagePromise instanceof Promise) {
				messagePromise.then(handleResponse).catch(reject);
			}
		} catch (e) {
			reject(e);
		}
	});
