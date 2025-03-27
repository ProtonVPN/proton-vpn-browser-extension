import {routeMessage} from '../messaging/messaging';
import {RefreshTokenError} from '../account/RefreshTokenError';
import {logOut} from '../state';
import {createSession} from '../account/createSession';
import {BackgroundAction} from '../messaging/MessageType';
import {ForkMessage, MessageBase} from '../messaging/Message';
import {forkSession} from '../messaging/forkSession';
import {triggerPromise} from '../tools/triggerPromise';
import {executeOnTab} from '../tools/executeOnTab';
import {getPartnerById} from '../account/partner/partners';
import {delay} from '../tools/delay';
import Tab = browser.tabs.Tab;

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
		async (request: WorkerExternalMessage, sender) => {
			if (request.type === BackgroundAction.FORK) {
				const response = await forkSession(request);

				const welcomePage = response?.partnerId
					? getPartnerById(response.partnerId)?.welcomePage
					: undefined;

				if (welcomePage) {
					await executeOnTab(
						(sender.tab as Tab).id as number,
						() => ({
							func(welcomePage: string) {
								location.href = welcomePage;
							},
							args: [welcomePage] as [string],
						}),
						() => `location.href = ${JSON.stringify(welcomePage)};`,
					);
					// Wait a bit to let the page load
					// But in case it's too slow, we'll still show the Proton success
					// So to let user know they can start using the extension
					await delay(500);
				}

				return response;
			}

			return;
		}
	);
};
