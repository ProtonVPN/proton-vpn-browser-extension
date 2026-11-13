'use popup';
import {escapeHtml} from '../../tools/escapeHtml';
import {c} from '../../tools/translate';
import type {User} from '../../account/user/User';

export const initializePlanSlot = (area: HTMLElement, user: User) => {
	const plan = escapeHtml(
		user.VPN.PlanTitle ||
			/* translator: plan title for free users */ c('Label').t`Free`,
	);

	area.querySelectorAll<HTMLDivElement>('.pm-plan').forEach((planName) => {
		// nosemgrep:insecure-innerhtml
		planName.innerHTML = plan;
	});
};
