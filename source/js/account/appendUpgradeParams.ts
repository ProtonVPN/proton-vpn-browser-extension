import {appendUrlParams} from '../tools/appendUrlParams';
import type {PmUser} from './user/PmUser';
import type {User} from './user/User';

/**
 * Pre-fill the upgrade page with what we already know about the user.
 */
export const appendUpgradeParams = async (
	url: string,
	user: User | undefined,
	getPmUser: () => Promise<PmUser | undefined>,
): Promise<string> => {
	const pmUser = await getPmUser();

	return appendUrlParams(url, {
		email: pmUser?.Email,
		// Preselect VPN Plus plan if the user has no plan
		// The user might have a plan without VPN entitlement
		// In such case we don't select a plan and let user choose
		plan: user?.Subscribed ? '' : 'vpn2024',
	});
};
