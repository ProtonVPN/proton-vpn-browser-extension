import {c} from '../tools/translate';
import {getNotifications} from './getNotifications';
import {milliSeconds} from '../tools/milliSeconds';
import {setJitterTimeout} from '../tools/delay';

let lastCheck = 0;

export const showNotifications = async () => {
	const now = Date.now();
	const notifications = (await getNotifications()).filter(notification => (
		!notification.StartTime || now >= milliSeconds.fromSeconds(notification.StartTime)
	) && (
		!notification.EndTime || now < milliSeconds.fromSeconds(notification.EndTime)
	));
	const notificationsSlot = document.querySelector('.notifications') as HTMLElement;

	if (notifications.length === 0) {
		notificationsSlot.innerHTML = '';

		return;
	}

	const offers = notifications.filter(notification => notification.Type === 0);
	await Promise.all(offers.map(notification => new Promise(resolve => {
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
	})));
	notificationsSlot.innerHTML = offers
		.map(notification => `
			<a href="${notification.Offer.URL}" title="${notification.Offer.Label}">
				${notification.Offer.Icon
			? `<img src="${notification.Offer.Icon}" alt="${notification.Offer.Label}" width="24" height="24" />`
			: notification.Offer.Label || c('Label').t`Offer`
		}
			</a>
		`)
		.join('');

	setJitterTimeout(milliSeconds.fromMinutes(30), milliSeconds.fromMinutes(5), async () => {
		const time = Date.now();

		if (time - lastCheck < milliSeconds.fromMinutes(15)) {
			return;
		}

		lastCheck = time;
		await showNotifications();
	});
};
