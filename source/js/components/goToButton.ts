export const configureGoToButtons =  (area: HTMLDivElement | Document, goTo: (page: string) => void) => {
	area.querySelectorAll('[data-go-to]').forEach(button => {
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

			event.preventDefault();
			event.stopPropagation();
		});
	});
};
