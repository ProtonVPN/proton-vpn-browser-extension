export type Theme = 'dark' | 'light' | 'auto';

const themes: Theme[] = ['dark', 'light', 'auto'];

/**
 * Apply the given theme to the popup: check the matching radio input and swap
 * the `*-theme` class on the area.
 */
export const setTheme = (area: HTMLElement, theme: Theme): void => {
	themes.forEach((choice) => {
		area
			.querySelectorAll<HTMLInputElement>(
				'[name="theme"][value="' + choice + '"]',
			)
			.forEach((input) => {
				input.checked = choice === theme;
			});
	});

	if (!area.classList.contains(theme + '-theme')) {
		themes.forEach((choice) => {
			area.classList[choice === theme ? 'add' : 'remove'](choice + '-theme');
		});
	}
};
