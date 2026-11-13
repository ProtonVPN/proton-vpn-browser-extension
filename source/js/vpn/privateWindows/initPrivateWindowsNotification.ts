'use background';
import {
	emitNotification,
	listenClick,
} from '../../notifications/emitNotification';
import {triggerPromise} from '../../tools/triggerPromise';
import {
	getPrivateWindowsMessage,
	isAllowedIncognitoAccess,
	openPrivateWindowsSettings,
	privateWindowsNoticeClosed,
	privateWindowsNotificationSent,
} from './privateWindowsAccess';

const notificationId = 'private-windows';

const emitIfPermissionMissing = async (
	translationsLoaded: Promise<unknown>,
): Promise<void> => {
	if (
		(await privateWindowsNotificationSent.get())?.value ||
		(await privateWindowsNoticeClosed.get())?.value ||
		(await isAllowedIncognitoAccess())
	) {
		return;
	}

	// Only the message needs translations. Wait before recording it as sent,
	// so it's not lost if the background stops in between.
	await translationsLoaded;
	await privateWindowsNotificationSent.set({value: 1});
	emitNotification(notificationId, getPrivateWindowsMessage());
};

/**
 * The first time the extension is detected as not allowed in private/incognito
 * windows (and the user did not close the popup notice), emit a system
 * notification, clicking it opens the extension settings.
 *
 * Must be called synchronously when the background starts: when the user
 * clicks the notification while the service worker (Chrome) or event page
 * (Firefox) is stopped, the browser starts it and delivers the click only to
 * listeners registered during that first run, not to ones added after an
 * await (such as loading translations).
 */
export const initPrivateWindowsNotification = (
	translationsLoaded: Promise<unknown>,
): void => {
	listenClick(notificationId, () => {
		triggerPromise(openPrivateWindowsSettings());
	});

	triggerPromise(emitIfPermissionMissing(translationsLoaded));
};
