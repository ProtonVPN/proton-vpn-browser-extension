import {storedNotificationsEnabled} from './notificationsEnabled';

type NotificationOptions = chrome.notifications.NotificationOptions;
type NotificationCreateOptions = chrome.notifications.NotificationCreateOptions;

export function emitNotification(
	notificationId: string,
	options: string | (Omit<NotificationOptions, 'type' | 'title' | 'iconUrl'> & Partial<NotificationOptions>),
	callback?: (notificationId: string) => void,
): void {
	storedNotificationsEnabled.getDefined({value: true}).then(({value: enabled}) => {
		if (!enabled) {
			return;
		}

		if (typeof options === 'string') {
			options = {message: options};
		}

		const notificationOptions = {
			type: 'basic',
			title: 'Proton VPN',
			iconUrl: '/img/icon-512.png',
			...options,
		} as NotificationCreateOptions;

		if (!notificationOptions.message) {
			return;
		}

		chrome?.notifications?.create(
			'proton-vpn-' + notificationId,
			notificationOptions,
			callback || (() => {}),
		);
	});
}
