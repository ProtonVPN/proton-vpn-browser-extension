import {routeMessage} from '../messaging/messaging';
import {RefreshTokenError} from '../account/RefreshTokenError';
import {logOut} from '../state';
import {createSession} from '../account/createSession';
import {BackgroundAction} from '../messaging/MessageType';
import {ForkMessage, MessageBase} from '../messaging/Message';
import {forkSession} from '../messaging/forkSession';
import {triggerPromise} from '../tools/triggerPromise';

type WorkerExternalMessage = MessageBase & (
	| {
		type: undefined;
	}
	| ForkMessage
);

const getMessageResponse = async (message: any) => {
	try {
		return await routeMessage(message);
	} catch (error) {
		if (error instanceof RefreshTokenError) {
			logOut(false);
			await createSession();

			return {error};
		}

		return {error};
	}
};

export const initMessaging = () => {
	global.browser || ((global as any).browser = chrome);

	browser.runtime.onMessage.addListener((message: any) => {
		const promise = new Promise(async resolve => {
			const result = await getMessageResponse(message);

			resolve({
				received: true,
				success: !result || !(typeof result === 'object' && (result as any).error),
				result,
			});
		});

		if (message.respondTo === 'broadcast') {
			promise.then(response => {
				triggerPromise(browser.runtime.sendMessage(
					browser.runtime.id,
					{
						type: 'answer:' + message.requestId,
						respondTo: 'none',
						data: (() => {
							try {
								return JSON.parse(JSON.stringify(response));
							} catch (error) {
								return {result: {error: `${error}`}};
							}
						})(),
					},
				));
			});

			return undefined;
		}

		return promise;
	});

	/**
	 * Consumes a session fork request and sends response
	 * to sender (account app) - to see full data flow :
	 * `applications/account/src/app/content/PublicApp.tsx`
	 */
	browser.runtime.onMessageExternal.addListener(
		async (request: WorkerExternalMessage) => {
			if (request.type === BackgroundAction.FORK) {
				return await forkSession(request);
			}

			return;
		}
	);
};
