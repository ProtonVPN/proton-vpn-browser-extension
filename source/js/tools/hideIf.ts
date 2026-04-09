import {each} from './each';

export const hideIf = (
	area: HTMLElement,
	conditionForSelectors: Record<string, boolean>,
): void => {
	each(conditionForSelectors, (selector, condition) => {
		if (condition) {
			area.querySelectorAll<HTMLDivElement>(selector).forEach((element) => {
				element.style.display = 'none';
			});
		}
	});
};
