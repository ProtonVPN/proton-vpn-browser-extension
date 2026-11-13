'use popup';
import type {Notification} from '../notifications/getNotifications';
import {NotificationType} from '../notifications/getNotifications';
import {renderPromotionBanner} from './renderPromotionBanner';
import {renderPromotionContainer} from './renderPromotionContainer';
import {getSeenPromotions} from './promotionState';
import {remove} from '../tools/remove';
import type {GetVpnStatus} from './promotionTelemetry';

const renderFirstBanner = async (
	notifications: Notification[],
	pageView: HTMLDivElement | null,
	userId: string,
	getVpnStatus: GetVpnStatus = () => 'off',
) => {
	if (!pageView) {
		return;
	}

	const seenPromotions = await getSeenPromotions(userId);

	await renderPromotionBanner(
		notifications.find(
			(n) =>
				n.Type === NotificationType.BANNER &&
				!seenPromotions.includes(n.NotificationID),
		),
		pageView,
		userId,
		getVpnStatus,
	);
};

export const filterNotifications = (
	notifications: Notification[],
): Notification[] => {
	const byEndTime = (a: Notification, b: Notification) =>
		(a.EndTime || Infinity) - (b.EndTime || Infinity);

	const {icons, banners} = notifications.reduce<{
		icons: Notification[];
		banners: Notification[];
	}>(
		(prev, notification) => {
			if (notification.Type === NotificationType.ICON) {
				return {...prev, icons: [...prev.icons, notification]};
			}

			if (notification.Type === NotificationType.BANNER) {
				return {...prev, banners: [...prev.banners, notification]};
			}

			return prev;
		},
		{icons: [], banners: []},
	);

	icons.sort(byEndTime);
	banners.sort(byEndTime);

	return [...(icons[0] ? [icons[0]] : []), ...banners];
};

export const renderPromotions = async (
	notifications: Notification[],
	container: HTMLElement,
	userId: string | undefined,
	getVpnStatus: GetVpnStatus = () => 'off',
): Promise<void> => {
	if (!container) {
		return;
	}

	const pageView = container.querySelector<HTMLDivElement>('.page-view');

	// Nowhere to display promotions
	if (!pageView) {
		return;
	}

	const pageViewInternal = pageView.querySelector<HTMLDivElement>(
		'.page-view-internal',
	);
	const sidebar = container.querySelector<HTMLElement>('.sidebar');

	// Remove pages and the icon buttons leading to this page before (re)-rendering
	remove(pageView, '*[data-page="promotion"]');
	remove(pageView, '.promotion-banner');
	remove(sidebar, '.promotion-button');

	// Without a user, seen and tracked promotions cannot be stored
	if (!userId) {
		return;
	}

	const filteredNotifications = filterNotifications(notifications);

	if (filteredNotifications.length === 0) {
		return;
	}

	let hasRenderedBanner = false;

	for (const notification of filteredNotifications) {
		if (notification.Type === NotificationType.ICON) {
			renderPromotionContainer(
				notification,
				pageViewInternal,
				sidebar,
				userId,
				getVpnStatus,
			);
		}

		if (notification.Type === NotificationType.BANNER && !hasRenderedBanner) {
			await renderFirstBanner(
				filteredNotifications,
				pageView,
				userId,
				getVpnStatus,
			);
			hasRenderedBanner = true;
		}
	}
};
