'use popup';
import {getCachedLocation, getLocation} from './getLocation';
import {setText} from '../components/setText';

export const refreshLocationSlots = async (
	area: HTMLElement,
	forceReload = false,
) => {
	const slots = area.querySelectorAll<HTMLElement>('.public-ip');

	if (slots.length === 0) {
		return;
	}

	const location = forceReload
		? await getLocation()
		: (await getCachedLocation())?.location;
	const ip = location?.IP;

	if (!ip) {
		return;
	}

	slots.forEach((ipSlot) => {
		if (ipSlot.innerText !== ip) {
			setText(ipSlot, ip);
		}
	});
};
