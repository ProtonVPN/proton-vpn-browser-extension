'use popup';
import type {Notification} from '../notifications/getNotifications';
import {c} from '../tools/translate';
import {renderThemeAssets} from './renderThemeAssets';
import {selectBestAsset} from './selectBestAsset';
import {
	type GetVpnStatus,
	sendOpenPromotion,
	sendPromotionDisplay,
} from './promotionTelemetry';
import {getPromotionUrl} from './getPromotionUrl';

const renderSidebarIcon = (
	sidebar: HTMLElement,
	notification: Notification,
	userId: string,
	getVpnStatus: GetVpnStatus = () => 'off',
) => {
	const sidebarTopSection = sidebar.querySelector(':scope > div');

	if (!sidebarTopSection) {
		return;
	}

	const promotionButton = document.createElement('button');
	promotionButton.className = 'side-button promotion-button';
	promotionButton.setAttribute('data-go-to', 'promotion');
	promotionButton.setAttribute('title', c('Info').t`Promotion`);
	promotionButton.setAttribute('aria-label', c('Info').t`Promotion`);
	promotionButton.setAttribute('data-context', 'Menu');

	promotionButton.innerHTML = `
		<svg role="img" viewBox="0 0 20 20">
			<use xlink:href="img/icons.svg#promotion"></use>
		</svg>
	`;

	promotionButton.addEventListener('click', () => {
		sendPromotionDisplay(notification, userId, 'popup', getVpnStatus());
	});

	sidebarTopSection.appendChild(promotionButton);
};

export const renderPromotionContainer = (
	notification: Notification,
	pageViewInternal: HTMLDivElement | null,
	sidebar: HTMLElement | null,
	userId: string,
	getVpnStatus: GetVpnStatus = () => 'off',
) => {
	if (!pageViewInternal || !sidebar) {
		return;
	}

	const {offsetWidth, offsetHeight} = pageViewInternal;

	const bestAsset = selectBestAsset(
		notification.Offer.Panel?.FullScreenImage?.Source,
		offsetWidth,
		offsetHeight,
		'vertical',
	);

	if (!bestAsset) {
		return;
	}

	renderSidebarIcon(sidebar, notification, userId, getVpnStatus);

	const promotionPage = document.createElement('div');
	promotionPage.setAttribute('data-page', 'promotion');

	const promotionContainer = document.createElement('div');
	promotionContainer.className = 'promotion-container';

	const promotionAsset = document.createElement('div');
	promotionAsset.className = 'promotion-asset';

	const alternativeText =
		notification.Offer.Panel?.FullScreenImage?.AlternativeText || '';

	renderThemeAssets({
		parent: promotionAsset,
		values: [
			{theme: 'dark', url: bestAsset.URL || bestAsset.URLLight || ''},
			{theme: 'light', url: bestAsset.URLLight || bestAsset.URL || ''},
		],
		alternativeText,
	});

	const buttonContainer = document.createElement('div');
	buttonContainer.className = 'get-promotion get-promotion-fade';
	const getPromotionButton = document.createElement('button');
	getPromotionButton.textContent =
		notification.Offer.Panel?.Button?.Text || c('Info').t`Get the deal`;

	const promotionUrl =
		notification.Offer.Panel?.Button?.URL || notification.Offer.URL;

	if (promotionUrl) {
		getPromotionButton.addEventListener('click', () => {
			sendOpenPromotion(
				getPromotionUrl(promotionUrl, notification),
				notification,
				'popup',
				getVpnStatus(),
			);
		});
	}

	buttonContainer.appendChild(getPromotionButton);
	promotionContainer.appendChild(promotionAsset);
	promotionContainer.appendChild(buttonContainer);

	promotionPage.appendChild(promotionContainer);
	pageViewInternal.appendChild(promotionPage);
};
