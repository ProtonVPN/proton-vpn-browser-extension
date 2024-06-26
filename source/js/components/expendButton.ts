import {connectionAttributes} from './connectionButton';

export const expandButton = <T extends Record<string, string|number>>(choice: T, title: string) => `
	<button title="${title}" class="expand-button" tabindex="0" ${connectionAttributes(choice)}><svg class="sm-icon" aria-label="${title}" viewBox="0 0 24 24" fill="currentColor">
		<path fill-rule="evenodd" d="M7.745 20.805a.75.75 0 0 1-.05-1.06L14.736 12 7.695 4.255a.75.75 0 1 1 1.11-1.01l7.5 8.25a.75.75 0 0 1 0 1.01l-7.5 8.25a.75.75 0 0 1-1.06.05Z" clip-rule="evenodd"/>
	</svg></button>
`;
