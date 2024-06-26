import {watchOnceBroadcastMessage} from './answering';

const root = global || window;
root.browser || ((root as any).browser = chrome);

export const sendMessageTo = <K>(
	type: string,
	data: any = undefined,
) => new Promise<K>(async (resolve, reject) => {
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

			const lastError = browser?.runtime?.lastError;

			if (lastError) {
				reject(lastError.message ? new Error(lastError.message) : lastError);

				return;
			}

			resolve(result);
		};

		const messagePromise = (() => {
			try {
				const requestId = Date.now() + ':' + Math.random();
				const sender = (browser.runtime.sendMessage as any)(
					browser.runtime.id,
					{type, data, respondTo: 'broadcast', requestId},
					undefined,
					handleResponse,
				);

				watchOnceBroadcastMessage('answer:' + requestId, handleResponse);

				return sender;
			} catch (e) {
				return browser.runtime.sendMessage(
					browser.runtime.id,
					{type, data, respondTo: 'promise'},
				);
			}
		})();

		if (messagePromise instanceof Promise) {
			handleResponse(await messagePromise);
		}
	} catch (e) {
		reject(e);
	}
});
