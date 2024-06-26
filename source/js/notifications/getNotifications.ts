import {fetchJson} from '../api';
import {CacheWrappedValue, Storage, storage} from '../tools/storage';
import {getCacheAge} from '../tools/getCacheAge';
import {triggerPromise} from '../tools/triggerPromise';
import {getNotificationsRefreshInterval} from '../intervals';

interface Notification {
	StartTime: number;
	EndTime: number;
	Type: number;
	Offer: {
		URL?: string;
		Icon?: string;
		Label?: string;
		Panel?: {
			IncentivePrice?: string|number;
			Incentive?: string;
			PictureURL?: string;
			Title?: string;
			Pill?: string;
			Features?: ({
				IconURL?: string;
				Text?: string;
			})[];
			FeaturesFooter?: string;
			Button?: {
				URL: string;
				Text: string;
			}
			PageFooter?: string;
			FullScreenImage?: {
				AlternativeText: string;
				Source?: ({
					URL: string;
					Type?: string;
					Width?: number;
					Height?: number;
					Ratio?: number;
				})[];
			};
		};
	};
}

const storedNotifications = storage.item<CacheWrappedValue<Notification[]>>('notifications', Storage.LOCAL)

const fetchNotifications = async (): Promise<Notification[]> => {
	const data = await fetchJson('core/v4/notifications');
	const { Notifications: notifications }: { Notifications: Notification[] } = data as any;

	if (notifications) {
		triggerPromise(storedNotifications.setValue(notifications));

		return notifications;
	}

	return [];
};

export const getNotifications = async (forceReload = false): Promise<Notification[]> => {
	if (!forceReload) {
		const cacheItem = await storedNotifications.load();
		const age = getCacheAge(cacheItem);

		if (age < getNotificationsRefreshInterval()) {
			return cacheItem?.value || [];
		}
	}

	try {
		return await fetchNotifications();
	} catch (e) {
		return [];
	}
};
