import {watchOnceBroadcastMessage} from './answering';
import {getRuntime} from './getRuntime';

const runtime = getRuntime();

export const sendMessageTo = <K>(type: string, data: any = undefined) =>
	// eslint-disable-next-line no-async-promise-executor
	new Promise<K>(async (resolve, reject) => {
		try {
			let handled = false;
			const handleResponse = (response: any) => {
				if (handled || !response) {
					return;
				}

				const result =
					response?.result !== undefined ? response.result : response;
				const error = result?.error;

				if (error && !error.Warning) {
					handled = true;
					reject(error);

					return;
				}

				const lastError = runtime?.lastError;

				if (lastError) {
					handled = true;
					reject(lastError.message ? new Error(lastError.message) : lastError);

					return;
				}

				handled = true;
				resolve(result);
			};

			if (!runtime) {
				reject(new Error('Extension runtime is not available'));
				return;
			}

			// In Firefox, browser.runtime.sendMessage natively returns a Promise.
			// Omit runtime.id so it triggers internal onMessage listeners, not onMessageExternal.
			if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
				try {
					const res = await browser.runtime.sendMessage({
						type,
						data,
						respondTo: 'promise',
					});
					if (res) {
						handleResponse(res);
						return;
					}
				} catch {
					// Fallback to runtime.sendMessage below
				}
			}

			const requestId = Date.now() + ':' + Math.random();
			watchOnceBroadcastMessage('answer:' + requestId, handleResponse);

			try {
				const message = {
					type,
					data,
					respondTo: 'broadcast',
					requestId,
				};
				const sender = (runtime.sendMessage as any)(message, handleResponse);

				if (sender instanceof Promise) {
					sender.then(handleResponse).catch(() => {});
				}
			} catch {
				const fallback = runtime.sendMessage({
					type,
					data,
					respondTo: 'promise',
				});
				if (fallback instanceof Promise) {
					fallback.then(handleResponse).catch(reject);
				}
			}
		} catch (e) {
			reject(e);
		}
	});

