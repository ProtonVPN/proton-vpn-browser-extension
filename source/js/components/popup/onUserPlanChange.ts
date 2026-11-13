'use popup';
import {BackgroundData} from '../../messaging/MessageType';
import {onRuntimeMessage} from '../../messaging/onRuntimeMessage';
import type {User} from '../../account/user/User';

/**
 * Trigger a callback when user plan (or tier) changes.
 */
export const onUserPlanChange = (user: User, callback: () => void) => {
	// The info the caller is aware of
	const originalTier = user?.VPN?.MaxTier;
	const originalPlan = user?.VPN?.PlanName;

	onRuntimeMessage(BackgroundData.USER, ({user: newUser}) => {
		if (!newUser) {
			return;
		}

		const newTier = newUser.VPN?.MaxTier;
		const newPlan = newUser.VPN?.PlanName;

		if (
			(typeof originalTier === 'number' &&
				typeof newTier === 'number' &&
				originalTier !== newTier) ||
			(typeof originalPlan === 'string' &&
				typeof newPlan === 'string' &&
				originalPlan !== newPlan)
		) {
			callback();
		}
	});
};
