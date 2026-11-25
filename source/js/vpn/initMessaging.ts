'use background';
/// <reference types="firefox-webext-browser"/>
import {routeMessage} from '../messaging/messaging';
import {RefreshTokenError} from '../account/RefreshTokenError';
import {logOut} from '../state';
import {createSession} from '../account/createSession';
import {BackgroundAction} from '../messaging/MessageType';
import type {ForkMessage, MessageBase} from '../messaging/Message';
import {forkSession} from '../messaging/forkSession';
import {executeOnTab} from '../tools/executeOnTab';
import {getPartnerById} from '../account/partner/partners';
import {delay} from '../tools/delay';
import {getRuntime} from '../tools/getRuntime';
import {setBackgroundRouter} from '../tools/dispatchToBackground';
import {serializeError} from '../messaging/errorSerialization';
import Tab = browser.tabs.Tab;

type WorkerExternalMessage = MessageBase &
	(
		| {
				type: undefined;
		  }
		| ForkMessage
	);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMessageResponse = async (message: any) => {
	try {
		return await routeMessage(message);
	} catch (error) {
		// For REFRESH_TOKEN, refreshToken() already signs out (SESSION_EXPIRED)
		if (
			error instanceof RefreshTokenError &&
			message?.type !== BackgroundAction.REFRESH_TOKEN
		) {
			logOut(false);
			await createSession();
		}

		return {error: serializeError(error)};
	}
};

export const initMessaging = () => {
	const runtime = getRuntime();

	// Background can't receive its own messages, so route them locally
	setBackgroundRouter(routeMessage);

	runtime?.onMessage.addListener(async (message: unknown) => {
		const result = await getMessageResponse(message);

		return {
			received: true,
			success:
				!result ||
				!(typeof result === 'object' && (result as {error: unknown}).error),
			result,
		};
	});

	/**
	 * Consumes a session fork request and sends response
	 * to sender (account app) - to see full data flow :
	 * `applications/account/src/app/content/PublicApp.tsx`
	 */
	runtime?.onMessageExternal.addListener(
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
		},
	);
};
