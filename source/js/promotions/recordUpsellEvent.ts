'use background';
import type {Notification} from '../notifications/getNotifications';
import {type Event, MeasurementGroup, recordEvent} from '../tools/telemetry';
import type {PromotionSurface, VpnStatus} from './promotionTelemetry';

export const recordUpsellEvent = (
	event: Event.UPSELL_DISPLAY | Event.UPSELL_UPGRADE_ATTEMPT,
	notification: Pick<Notification, 'Reference'>,
	surface: PromotionSurface,
	vpnStatus: VpnStatus,
): void =>
	recordEvent(MeasurementGroup.UPSELL, event, {
		modal_source: 'promo_offer',
		modal_trigger:
			surface === 'banner' ? 'promo_offer_banner' : 'promo_offer_popup',
		reference: notification.Reference || '',
		vpn_status: vpnStatus,
	});
