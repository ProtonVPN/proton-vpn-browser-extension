import type {Notification} from '../notifications/getNotifications';
import {BackgroundAction} from '../messaging/MessageType';
import {sendMessageToBackground} from '../tools/sendMessageToBackground';
import {catchPromise} from '../tools/triggerPromise';

export type PromotionSurface = 'banner' | 'popup';

export type VpnStatus = 'on' | 'off';

/** Read when the event happens, so a connection change after rendering is reported */
export type GetVpnStatus = () => VpnStatus;

export type PromotionEventData = {
	notification: Pick<Notification, 'NotificationID' | 'Reference'>;
	surface: PromotionSurface;
	vpnStatus: VpnStatus;
};

/** The popup knows which user the promotions were fetched for */
export type PromotionDisplayData = PromotionEventData & {
	userId: string;
};

export type OpenPromotionData = PromotionEventData & {
	url: string;
};

const getEventData = (
	{NotificationID, Reference}: Notification,
	surface: PromotionSurface,
	vpnStatus: VpnStatus,
): PromotionEventData => ({
	notification: {NotificationID, Reference},
	surface,
	vpnStatus,
});

/**
 * Telemetry is sent by the background so that it is not lost
 * when the popup closes (e.g. when a new tab takes the focus).
 */
export const sendPromotionDisplay = (
	notification: Notification,
	userId: string,
	surface: PromotionSurface,
	vpnStatus: VpnStatus,
) => {
	catchPromise(
		sendMessageToBackground(BackgroundAction.PROMOTION_DISPLAY, {
			...getEventData(notification, surface, vpnStatus),
			userId,
		} satisfies PromotionDisplayData),
	);
};

/**
 * The background records the upgrade attempt and opens the tab itself,
 * so closing the popup can't interrupt the telemetry request.
 */
export const sendOpenPromotion = (
	url: string,
	notification: Notification,
	surface: PromotionSurface,
	vpnStatus: VpnStatus,
) => {
	catchPromise(
		sendMessageToBackground(BackgroundAction.OPEN_PROMOTION, {
			...getEventData(notification, surface, vpnStatus),
			url,
		} satisfies OpenPromotionData),
	);
};
