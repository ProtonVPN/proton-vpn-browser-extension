import {fetchJson} from '../api';
import type {CacheWrappedValue} from '../tools/storage';
import {Storage, storage} from '../tools/storage';
import {getCacheAge} from '../tools/getCacheAge';
import {triggerPromise} from '../tools/triggerPromise';
import {getNotificationsRefreshInterval} from '../intervals';
import {milliSeconds} from '../tools/milliSeconds';

export enum NotificationType {
	ICON = 0,
	SPLASH = 1,
	BANNER = 2,
	PROMINENT_BANNER = 3,
	NPS_SURVEY = 4,
	IAP_POPUP = 5,
	PAYWALL = 6,
	PADLOCK = 7,
}

export interface Notification {
	NotificationID: string;
	StartTime: number;
	EndTime: number;
	Type: NotificationType;
	Reference?: string;
	Offer: {
		Action?: string;
		Behaviors?: string[];
		URL?: string;
		Icon?: string;
		Label?: string;
		Panel?: {
			IncentivePrice?: string | number;
			Incentive?: string;
			PictureURL?: string;
			Title?: string;
			Pill?: string;
			Features?: {
				IconURL?: string;
				Text?: string;
			}[];
			FeaturesFooter?: string;
			Button?: {
				URL: string;
				Text: string;
				Action?: string;
				Behaviors?: string[];
			};
			PageFooter?: string;
			FullScreenImage?: {
				AlternativeText: string;
				Source?: {
					URL: string;
					Type?: string;
					Width?: number;
					Height?: number;
					Ratio?: number;
					URLLight?: string;
				}[];
			};
		};
	};
}

const storedNotifications = storage.item<CacheWrappedValue<Notification[]>>(
	'notifications',
	Storage.LOCAL,
);

const fetchNotifications = async (): Promise<Notification[]> => {
	const {Notifications: notifications} = await fetchJson<{
		Notifications: Notification[];
	}>('core/v4/notifications');

	if (notifications) {
		triggerPromise(storedNotifications.setValue(notifications));

		return notifications;
	}

	return [];
};

export const clearNotificationsCache = (): Promise<void> =>
	storedNotifications.remove();

export const getNotifications = async (): Promise<Notification[]> => {
	const cacheItem = await storedNotifications.load();
	const age = getCacheAge(cacheItem);

	if (age < getNotificationsRefreshInterval()) {
		return cacheItem?.value || [];
	}

	try {
		return await fetchNotifications();
	} catch {
		return [];
	}
};

export const getActiveNotifications = async (): Promise<Notification[]> => {
	const now = Date.now();
	return (await getNotifications()).filter(
		(notification) =>
			(!notification.StartTime ||
				now >= milliSeconds.fromSeconds(notification.StartTime)) &&
			(!notification.EndTime ||
				now < milliSeconds.fromSeconds(notification.EndTime)),
	);
};
