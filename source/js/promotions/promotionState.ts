import {storage} from '../tools/storage';

/**
 * Promotion state (seen banners, tracked displays) must be scoped per user,
 * otherwise it is shared between accounts logging in to the same browser
 * (see VPNPLG-179).
 *
 * The PM user ID is used as it is stable across logins, unlike the session UID.
 * Callers are responsible for resolving it, and should skip promotions entirely
 * when no user is available rather than reading or writing unscoped state.
 */
const getScopedKey = (key: string, userId: string) => `${key}-${userId}`;

const getList = async (key: string) =>
	(await storage.getItem<string[]>(key, [])) || [];

const addToList = async (key: string, id: string) => {
	const list = await getList(key);

	if (!list.includes(id)) {
		await storage.setItem(key, [...list, id]);
	}
};

export const getSeenPromotions = (userId: string) =>
	getList(getScopedKey('seenPromotions', userId));

export const addSeenPromotion = (userId: string, id: string) =>
	addToList(getScopedKey('seenPromotions', userId), id);

export const hasTrackedPromotion = async (userId: string, id: string) =>
	(await getList(getScopedKey('trackedPromotions', userId))).includes(id);

export const addTrackedPromotion = (userId: string, id: string) =>
	addToList(getScopedKey('trackedPromotions', userId), id);
