'use popup';
import {addSeenPromotion} from './promotionState';

export const closeBannerAction = async (
	notificationId: string,
	userId: string,
	clickedElement: HTMLButtonElement,
	onBannerClosed?: () => Promise<void>,
) => {
	const promotionBanner =
		clickedElement.closest<HTMLDivElement>('.promotion-banner');

	if (promotionBanner) {
		promotionBanner.remove();

		await addSeenPromotion(userId, notificationId);

		if (onBannerClosed) {
			await onBannerClosed();
		}
	}
};
