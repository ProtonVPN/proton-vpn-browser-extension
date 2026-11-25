'use popup';
import {c} from '../tools/translate';
import {remove} from '../tools/remove';
import type {Notification} from '../notifications/getNotifications';
import {closeBannerAction} from './closeBannerAction';
import {
	type GetVpnStatus,
	sendOpenPromotion,
	sendPromotionDisplay,
} from './promotionTelemetry';
import {getPromotionUrl} from './getPromotionUrl';
import {renderThemeAssets} from './renderThemeAssets';
import {selectBestAsset} from './selectBestAsset';

export const renderPromotionBanner = async (
	notification: Notification | undefined,
	container: HTMLDivElement | null,
	userId: string,
	getVpnStatus: GetVpnStatus = () => 'off',
) => {
	if (!container) {
		return;
	}

	// There should be only 1 banner at a time, remove existing one before (re)-rendering
	remove(container, '.promotion-banner');

	if (!notification) {
		return;
	}

	const {offsetWidth, offsetHeight} = container;
	const bestAsset = selectBestAsset(
		notification.Offer.Panel?.FullScreenImage?.Source,
		offsetWidth,
		offsetHeight,
		'horizontal',
	);

	if (!bestAsset) {
		return;
	}

	const promotionBanner = document.createElement('div');
	promotionBanner.className = 'promotion-banner';
	promotionBanner.setAttribute(
		'data-notification-id',
		notification.NotificationID,
	);

	const title =
		notification.Offer.Panel?.Title ||
		notification.Offer.Label ||
		c('Info').t`Promotion`;

	promotionBanner.ariaLabel = title;
	promotionBanner.tabIndex = 2;

	promotionBanner.title = title;
	const alternativeText =
		notification.Offer.Panel?.FullScreenImage?.AlternativeText || '';

	const bannerInternal = document.createElement('div');
	bannerInternal.className = 'promotion-banner-internal';

	const closeButton = document.createElement('button');
	const closeButtonTitle = c('Action').t`Close the banner`;
	closeButton.title = closeButtonTitle;
	closeButton.ariaLabel = closeButtonTitle;
	closeButton.innerHTML = `
		<svg viewBox="0 0 24 24">
			<use xlink:href="img/icons.svg#close-button"></use>
		</svg>
	`;
	closeButton.addEventListener('click', (event) =>
		closeBannerAction(
			notification.NotificationID,
			userId,
			event.target as HTMLButtonElement,
		),
	);

	const anchor = document.createElement('a');
	const promotionUrl = notification.Offer.URL;

	if (promotionUrl) {
		anchor.addEventListener('click', () => {
			sendOpenPromotion(
				getPromotionUrl(promotionUrl, notification),
				notification,
				'banner',
				getVpnStatus(),
			);
		});
	}

	renderThemeAssets({
		parent: anchor,
		values: [
			{theme: 'dark', url: bestAsset.URL || bestAsset.URLLight || ''},
			{theme: 'light', url: bestAsset.URLLight || bestAsset.URL || ''},
		],
		alternativeText,
	});

	bannerInternal.appendChild(closeButton);
	bannerInternal.appendChild(anchor);

	promotionBanner.appendChild(bannerInternal);

	container.appendChild(promotionBanner);

	sendPromotionDisplay(notification, userId, 'banner', getVpnStatus());
};
