import {connectionAttributes} from './connectionButton';

export const expandButton = <T extends Record<string, string|number>>(choice: T, title: string) => `
	<button title="${title}" class="expand-button" tabindex="0" ${connectionAttributes(choice)}><svg class="sm-icon" aria-label="${title}" viewBox="0 0 24 24" fill="currentColor">
		<use xlink:href="img/icons.svg#expand-button"></use>
	</svg></button>
`;
