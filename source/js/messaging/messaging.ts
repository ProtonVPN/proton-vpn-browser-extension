'use background';
import {getRegisteredLocaleFromUser} from '../account/user/getRegisteredLocaleFromUser';
import {readSession} from '../account/readSession';
import {getFreshUser} from '../account/user/getUser';
import {getPmUser} from '../account/user/getPmUser';
import {connectLogical, disconnect, getCurrentState, logOut} from '../state';
import {createSession} from '../account/createSession';
import {isSessionStillUsingRefreshToken} from '../account/refreshTokenFingerprint';
import {
	BackgroundAction,
	BackgroundData,
	type BackgroundExtraData,
	type BackgroundMessage,
	PermissionGrant,
	type SessionExpiredData,
	SettingChange,
	StateChange,
} from './MessageType';
import {triggerPromise} from '../tools/triggerPromise';
import {sendForkResponse} from '../tools/openTabs';
import {setupHandleProxyRequest} from '../tools/setupHandleProxyRequest';
import {registerLocale} from '../tools/locale';
import {
	type BroadcastMessage,
	broadcastMessage,
} from '../tools/broadcastMessage';
import {record} from '../log/record';
import {forkSession} from './forkSession';
import type {Logical} from '../vpn/Logical';
import type {Server} from '../vpn/Server';
import type {SplitTunnelingConfig} from '../vpn/ConnectionState';
import {
	handleOpenPromotion,
	handlePromotionDisplay,
} from '../promotions/handlePromotionTelemetry';
import type {
	OpenPromotionData,
	PromotionDisplayData,
} from '../promotions/promotionTelemetry';

type LocaleMessage = BroadcastMessage<
	BackgroundData.LOCALE,
	{locale: string | undefined}
>;

export const routeMessage = async <T extends BackgroundMessage>(message: {
	type: T;
	data: T extends keyof BackgroundExtraData
		? BackgroundExtraData[T] | undefined
		: unknown;
}) => {
	const {type, data} = message;

	switch (type) {
		case BackgroundAction.FORK:
			await sendForkResponse(
				(message as {tabId?: number}).tabId,
				await forkSession(message),
			);

			return null;

		case BackgroundData.USER:
			if (!(await readSession())?.uid) {
				throw new Error('No session');
			}

			return await getFreshUser();

		case BackgroundData.PM_USER: {
			if (!(await readSession())?.uid) {
				throw new Error('No session');
			}

			const user = await getPmUser(true);
			const locale = getRegisteredLocaleFromUser(user);

			// Background can't receive its own messages, so update it directly
			registerLocale(locale);
			// Then notify the popup (if open)
			broadcastMessage<LocaleMessage>(BackgroundData.LOCALE, {locale});

			return user;
		}

		case StateChange.SIGN_OUT:
			logOut(true);
			await createSession();
			break;

		case StateChange.SWITCH_ACCOUNT:
			logOut(false);
			await createSession();
			break;

		case StateChange.SESSION_EXPIRED:
			// The rejected refresh token was replaced in the meantime:
			// another refresh won the race, the session is valid.
			if (
				!(await isSessionStillUsingRefreshToken(
					(data as SessionExpiredData | undefined)?.refreshTokenFingerprint,
				))
			) {
				break;
			}

			logOut(false);
			await createSession();
			break;

		case BackgroundData.STATE:
			return getCurrentState().data;

		case StateChange.DISCONNECT:
			disconnect();
			break;

		case StateChange.CONNECTING:
			getCurrentState().checkConnectingState?.(
				(data as {connectionAttemptTime: number}).connectionAttemptTime,
			);
			break;

		case StateChange.CONNECT:
			await (({logical, server, splitTunneling}) =>
				connectLogical(logical, server, splitTunneling))(
				data as {
					logical: Logical;
					server: Server;
					splitTunneling?: SplitTunnelingConfig;
				},
			);
			break;

		case BackgroundAction.FORGET_ERROR:
			delete getCurrentState().data.error;
			break;

		case BackgroundAction.LOG:
			record(data);
			break;

		case BackgroundAction.PROMOTION_DISPLAY:
			triggerPromise(handlePromotionDisplay(data as PromotionDisplayData));
			break;

		case BackgroundAction.OPEN_PROMOTION:
			handleOpenPromotion(data as OpenPromotionData);
			break;

		case PermissionGrant.PROXY:
			setupHandleProxyRequest();
			break;

		case SettingChange.BYPASS_LIST:
			getCurrentState().setOption?.(type, data);
			break;
	}

	return undefined;
};
