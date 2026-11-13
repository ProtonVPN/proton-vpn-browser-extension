'use popup';
import {getInfoFromBackground} from '../../tools/getInfoFromBackground';
import {BackgroundData} from '../../messaging/MessageType';
import {escapeHtml} from '../../tools/escapeHtml';
import type {PmUser} from '../../account/user/PmUser';

export const loadPmUserIntoPopup = (
	area: HTMLElement,
	setPmUser: (user: PmUser) => void,
) => {
	getInfoFromBackground(BackgroundData.PM_USER).then((pmUser) => {
		if (!pmUser) {
			return;
		}

		setPmUser(pmUser);
		const name = escapeHtml(
			pmUser.DisplayName || pmUser.Name || pmUser.Email || '',
		);

		if (!name) {
			return;
		}

		area
			.querySelectorAll<HTMLDivElement>('.pm-user-name')
			.forEach((userName) => {
				// nosemgrep:insecure-innerhtml
				userName.innerHTML = name;
			});
	});
};
