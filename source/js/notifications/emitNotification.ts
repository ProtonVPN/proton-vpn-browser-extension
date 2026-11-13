import {Notification} from '../vpn/features/Notification';

type NotificationOptions = chrome.notifications.NotificationOptions;
type NotificationCreateOptions = chrome.notifications.NotificationCreateOptions;

export type NotificationSummary = Omit<
	NotificationOptions,
	'type' | 'title' | 'iconUrl'
> &
	Partial<NotificationOptions>;

const getNotifications = () => chrome?.notifications;

const getNotificationId = (id: string) => 'proton-vpn-' + id;

export const listenButtonClick = (
	notificationId: string,
	callback: (buttonIndex: number) => void,
) => {
	try {
		getNotifications()?.onButtonClicked.addListener((id, buttonIndex) => {
			if (id === getNotificationId(notificationId)) {
				callback(buttonIndex);
			}
		});
	} catch {
		// Browser does not support this feature, which is fine, notifications will then just not be clickable
	}
};

export const listenClick = (notificationId: string, callback: () => void) => {
	try {
		getNotifications()?.onClicked.addListener((id) => {
			if (id === getNotificationId(notificationId)) {
				callback();
			}
		});
	} catch {
		// Browser does not support this feature, which is fine, notifications will then just not be clickable
	}
};

export function emitNotification(
	notificationId: string,
	options: string | NotificationSummary,
	callback?: (notificationId: string) => void,
): void {
	Notification.create()
		.then((notification) => notification.getConfig())
		.then(({value: enabled}) => {
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

			getNotifications()?.create(
				getNotificationId(notificationId),
				notificationOptions,
				callback || (() => {}),
			);
		});
}
