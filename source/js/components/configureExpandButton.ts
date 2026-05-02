import {stopEvent} from '../tools/stopEvent';
import {via} from './via';
import {getCountryFlag} from '../tools/getCountryFlag';
import {getCountryNameOrCode} from '../tools/translate';
import type {Logical} from '../vpn/Logical';
import type {Choice} from '../vpn/lastChoice';

export const configureExpandButton = (
	area: HTMLElement,
	isSecureCoreEnabled: () => boolean,
	onClick: (
		element: HTMLElement,
		callback: (event: MouseEvent | KeyboardEvent) => void,
	) => void,
	goToRegion: (name: string, content: string) => void,
	getLogicalFromButton: (button: HTMLButtonElement) => {
		getLogical: () => Logical | null | undefined;
		choice: Omit<Choice, 'connected'>;
	},
) => {
	area
		.querySelectorAll<HTMLButtonElement>(
			'.expand-button:not(.expand-button-configured)',
		)
		.forEach((button) => {
			button.classList.add('expand-button-configured');

			let parent = button.parentNode as HTMLDivElement;
			const max = area;

			while (
				parent !== max &&
				!parent?.classList?.contains('country-header') &&
				!parent?.classList?.contains('server-type')
			) {
				parent = parent.parentNode as HTMLDivElement;
			}

			if (parent !== max) {
				button.addEventListener('mouseover', () => {
					parent.classList.add('hover');
				});

				button.addEventListener('mouseout', () => {
					parent.classList.remove('hover');
				});
			}

			onClick(button, async (event) => {
				stopEvent(event);

				const id = button.getAttribute('data-expand');
				const {choice} = getLogicalFromButton(button);
				const code = `${choice.exitCountry}`;
				const expandContent =
					(id &&
						((window as any).sectionBuilder?.[id]?.() ||
							area.querySelector(`#${id}`)?.innerHTML)) ||
					'';

				goToRegion(
					`
						<div class="country-flag">
							${isSecureCoreEnabled() ? via() : ''}
							${getCountryFlag(code)}
						</div>
						<div class="country-name" data-country-code="${code}">
							${button.getAttribute('data-subGroupName') || getCountryNameOrCode(code)}
						</div>
					`,
					expandContent,
				);
			});
		});
};
