import {getCachedLocation, getLocation} from './getLocation';
import {escapeHtml} from '../tools/escapeHtml';

export const refreshLocationSlots = async (forceReload = false) => {
	const slots = document.querySelectorAll<HTMLElement>('.public-ip');

	if (slots.length === 0) {
		return;
	}

	const location = forceReload ? (await getLocation()) : (await getCachedLocation())?.location;
	const ip = location?.IP;

	if (!ip) {
		return;
	}

	slots.forEach(ipSlot => {
		if (ipSlot.innerText !== ip) {
			ipSlot.innerHTML = escapeHtml(ip);
		}
	});
};
