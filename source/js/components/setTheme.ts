export type Theme = 'dark' | 'light' | 'auto';

export const setTheme = (area: HTMLElement, theme: Theme) => {
	const themes = ['dark', 'light', 'auto'];

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
