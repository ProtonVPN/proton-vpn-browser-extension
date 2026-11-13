import {sendMessageTo} from './sendMessageTo';
import type {BackgroundMessage} from '../messaging/MessageType';

type BackgroundRouter = (message: {
	type: BackgroundMessage;
	data: unknown;
}) => Promise<unknown>;

let backgroundRouter: BackgroundRouter | undefined;

/**
 * Called once by the background (see `initMessaging`) so that messages
 * dispatched from the background itself are routed locally.
 *
 * This is needed because `runtime.sendMessage` never triggers `onMessage`
 * listeners in the frame that sent it.
 */
export const setBackgroundRouter = (router: BackgroundRouter | undefined) => {
	backgroundRouter = router;
};

/**
 * Send a message to be handled by the background, from any context:
 * - in the background: handled directly by the registered router
 * - elsewhere (popup, onboarding...): sent via `runtime.sendMessage`
 */
export const dispatchToBackground = async <K>(
	type: BackgroundMessage,
	data: unknown = undefined,
): Promise<K> =>
	backgroundRouter
		? ((await backgroundRouter({type, data})) as K)
		: sendMessageTo<K>(type, data);
