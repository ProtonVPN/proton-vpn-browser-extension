'use popup';
import {storage} from '../../tools/storage';
import {setTheme} from '../setTheme';

type Theme = 'dark' | 'light' | 'auto';

export const handleTheme = (area: HTMLElement) => {
	let theme: Theme = 'dark';

	const storedTheme = storage.item<{value: Theme}>('theme');
	storedTheme.get().then((themeCache) => {
		theme = themeCache?.value || theme;
		setTheme(area, theme);
	});

	return {
		initializeThemeSelector() {
			area
				.querySelectorAll<HTMLInputElement>('.theme-choice input')
				.forEach((input) => {
					input.addEventListener('change', async () => {
						if (input.checked) {
							const value = input.value as Theme;
							setTheme(area, value);
							await storedTheme.set({value});
						}
					});
				});
		},
	};
};
