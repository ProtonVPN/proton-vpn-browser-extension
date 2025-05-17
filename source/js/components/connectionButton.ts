import {c} from '../tools/translate';
import {escapeHtml} from '../tools/escapeHtml';
import {getKeysAndValues} from '../tools/getKeysAndValues';

export const connectionAttributes = <T extends Record<string, string | number>>(data: T) => getKeysAndValues(data)
	.map(({key, value}) => ` data-${key as string}="${escapeHtml(`${value}`)}"`)
	.join('');

export const connectionButton = <T extends Record<string, string | number>>(data: T) => `
	<button class="connection-button"${connectionAttributes(data)}>
		<span class="text">${c('Action').t`Connect`}</span>
		<svg viewBox="0 0 64 64" class="icon">
			<use xlink:href="img/icons.svg#connect"></use>
		</svg>
	</button>
`;
