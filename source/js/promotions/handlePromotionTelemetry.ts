'use background';
import {openTab} from '../tools/openTab';
import {catchPromise} from '../tools/triggerPromise';
import {Event} from '../tools/telemetry';
import {recordUpsellEvent} from './recordUpsellEvent';
import {hasTrackedPromotion, addTrackedPromotion} from './promotionState';
import type {
	OpenPromotionData,
	PromotionDisplayData,
} from './promotionTelemetry';

// Display of the same promotion can be reported again while the storage is being read
const pendingDisplays = new Set<string>();

export const handlePromotionDisplay = async ({
	notification,
	surface,
	vpnStatus,
	userId,
}: PromotionDisplayData) => {
	const id = notification.NotificationID;

	if (pendingDisplays.has(id)) {
		return;
	}

	pendingDisplays.add(id);

	try {
		// Without a user, the display cannot be deduplicated, so it is not recorded
		if (!userId || (await hasTrackedPromotion(userId, id))) {
			return;
		}

		recordUpsellEvent(Event.UPSELL_DISPLAY, notification, surface, vpnStatus);

		// Only mark as tracked once the event has been handed off to telemetry
		await addTrackedPromotion(userId, id);
	} finally {
		pendingDisplays.delete(id);
	}
};

export const handleOpenPromotion = ({
	url,
	notification,
	surface,
	vpnStatus,
}: OpenPromotionData) => {
	recordUpsellEvent(
		Event.UPSELL_UPGRADE_ATTEMPT,
		notification,
		surface,
		vpnStatus,
	);
	catchPromise(openTab(url));
};
