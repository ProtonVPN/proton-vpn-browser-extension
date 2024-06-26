import {c} from '../tools/translate';

export const setUpSearch = (input: HTMLInputElement, callback: (searchText: string) => void): (() => void) => {
	input.placeholder = /* translator: Search placeholder */ c('Label').t`Countries, cities, servers`;

	const refresh = () => {
		const searchText = input.value;

		(input.parentNode?.querySelectorAll<HTMLElement>('.reset-button') || []).forEach(button => {
			button.style.display = searchText === '' ? 'none' : 'block';
			button.setAttribute('tabindex', searchText === '' ? '-1' : '0');
		});

		callback(searchText);
	};

	input.addEventListener('input', refresh);

	(input.parentNode?.querySelectorAll<HTMLElement>('.reset-button') || []).forEach(button => {
		button.addEventListener('click', () => {
			input.value = '';
			refresh();
		});
	});

	return refresh;
};
