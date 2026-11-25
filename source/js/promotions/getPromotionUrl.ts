'use popup';
import type {Notification} from '../notifications/getNotifications';
import {appendUrlParams} from '../tools/appendUrlParams';

/** Lets the promotion page know which notification the user came from */
export const getPromotionUrl = (
	url: string,
	notification: Pick<Notification, 'Reference'>,
): string =>
	appendUrlParams(url, {
		'notification-reference': notification.Reference,
	});
