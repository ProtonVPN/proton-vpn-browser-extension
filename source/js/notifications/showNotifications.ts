import {c} from '../tools/translate';
import {milliSeconds} from '../tools/milliSeconds';
import {setJitterTimeout} from '../tools/delay';
import {escapeHtml} from '../tools/escapeHtml';
import {describeButton} from '../components/connectionButton';
import {getNotifications} from './getNotifications';
import type {Notification} from './getNotifications';

let lastCheck = 0;

const getNotificationLink = (notification: Notification) => {
	const label =
		notification.Offer.Label ||
		/* translator: Fallback link text when an offer is available but has no icon, clicking on it open a page showing the offer */ c(
			'Label',
		).t`Offer`;

	return `<a href="${notification.Offer.URL}" ${describeButton(label)}>
		${
			notification.Offer.Icon
				? `<img src="${notification.Offer.Icon}" alt="${escapeHtml(label)}" width="24" height="24" />`
				: label
		}
	</a>`;
};

export const showNotifications = async (area: HTMLElement) => {
	const now = Date.now();
	const notifications = (await getNotifications()).filter(
		(notification) =>
			(!notification.StartTime ||
				now >= milliSeconds.fromSeconds(notification.StartTime)) &&
			(!notification.EndTime ||
				now < milliSeconds.fromSeconds(notification.EndTime)),
	);
	const notificationsSlot = area.querySelector<HTMLElement>('.notifications')!;

	if (notifications.length === 0) {
		notificationsSlot.innerHTML = '';

		return;
	}

	const offers = notifications.filter(
		(notification) => notification.Type === 0,
	);
	await Promise.all(
		offers.map(
			(notification) =>
				new Promise((resolve) => {
					if (!notification.Offer.Icon) {
						resolve(null);

						return;
					}

					const image = new Image();
					image.src = notification.Offer.Icon;

					if (image.width) {
						resolve(null);

						return;
					}

					image.onload = resolve;
					image.onerror = resolve;
				}),
		),
	);
	notificationsSlot.innerHTML = offers.map(getNotificationLink).join('');

	setJitterTimeout(
		milliSeconds.fromMinutes(30),
		milliSeconds.fromMinutes(5),
		async () => {
			const time = Date.now();

			if (time - lastCheck < milliSeconds.fromMinutes(15)) {
				return;
			}

			lastCheck = time;
			await showNotifications(area);
		},
	);
};
