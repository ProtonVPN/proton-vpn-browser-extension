'use popup';
import {setNewTabLinkTitle} from '../links';
import {accountURL} from '../../config';
import {openTab} from '../../tools/openTab';
import {forgetAccount} from '../../account/forgetAccount';

export const configureLinksToAccountPage = (
	area: HTMLElement,
	appendUpgradeParams: (url: string) => Promise<string>,
): void => {
	area
		.querySelectorAll<HTMLDivElement>('[data-open-account-page]')
		.forEach((button) => {
			setNewTabLinkTitle(button);
			button.addEventListener('click', async () => {
				const url = accountURL + button.getAttribute('data-open-account-page');

				await openTab(await appendUpgradeParams(url));
				forgetAccount();
			});
		});
};
