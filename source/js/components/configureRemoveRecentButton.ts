import {stopEvent} from '../tools/stopEvent';
import {forgetChoice} from '../vpn/lastChoice';

export const configureRemoveRecentButton = (
	area: HTMLElement,
	onClick: (
		element: HTMLElement,
		callback: (event: MouseEvent | KeyboardEvent) => void,
	) => void,
	refresh: () => void,
) => {
	area
		.querySelectorAll<HTMLButtonElement>(
			'.remove-recent-button:not(.remove-recent-button-configured)',
		)
		.forEach((button) => {
			button.classList.add('remove-recent-button-configured');

			onClick(button, (event) => {
				stopEvent(event);

				forgetChoice(JSON.parse(button.getAttribute('data-forget-recent')!));
				refresh();
			});
		});
};
