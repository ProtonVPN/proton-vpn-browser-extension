'use popup';
import {renderPromotions} from '../../promotions/renderPromotions';
import {configureGoToButtons} from '../goToButton';
import {maybeShowRatingModal} from '../modals/ratingModal';
import {updateLastActivityTime} from '../../tools/activity';
import {getActivityCheckInterval} from '../../intervals';
import type {Notification} from '../../notifications/getNotifications';
import type {User} from '../../account/user/User';
import type {PmUser} from '../../account/user/PmUser';
import type {GetVpnStatus} from '../../promotions/promotionTelemetry';

export const finishPopupRendering = async (
	area: HTMLElement,
	goTo: (page: string) => void,
	user: User | undefined,
	activePromotionsPromise: Promise<Notification[]>,
	getPmUser: () => Promise<PmUser | undefined>,
	getVpnStatus: GetVpnStatus = () => 'off',
) => {
	try {
		const [notifications, pmUser] = await Promise.all([
			activePromotionsPromise,
			getPmUser().catch(() => undefined),
		]);

		await renderPromotions(notifications, area, pmUser?.ID, getVpnStatus);
	} finally {
		configureGoToButtons(area, goTo);

		maybeShowRatingModal(
			area.querySelector<HTMLDialogElement>('#rate-us'),
			user,
		);

		setTimeout(updateLastActivityTime, 1);
		setInterval(updateLastActivityTime, getActivityCheckInterval());
	}
};
