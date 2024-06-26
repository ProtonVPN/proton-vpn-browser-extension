import {each} from './each';

export const hideIf = (conditionForSelectors: Record<string, boolean>, area?: HTMLElement | Document): void => {
	each(conditionForSelectors, (selector, condition) => {
		if (condition) {
			(area || document).querySelectorAll<HTMLDivElement>(selector).forEach(element => {
				element.style.display = 'none';
			});
		}
	});
};
