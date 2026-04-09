import {stopEvent} from '../tools/stopEvent';

export const configureGoToButtons = (
	area: HTMLElement,
	goTo: (page: string) => void,
) => {
	area.querySelectorAll('[data-go-to]').forEach((button) => {
		if (button.classList.contains('go-to-configured')) {
			return;
		}

		button.classList.add('go-to-configured');

		button.addEventListener('click', (event) => {
			const page = button.getAttribute('data-go-to');

			if (page) {
				goTo(page);

				button.classList.add('active');
				button.setAttribute('aria-current', 'true');
			}

			stopEvent(event);
		});
	});
};
