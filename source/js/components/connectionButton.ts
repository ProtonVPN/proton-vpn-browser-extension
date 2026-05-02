import {c} from '../tools/translate';
import {escapeHtml} from '../tools/escapeHtml';
import {getKeysAndValues} from '../tools/getKeysAndValues';
import type {Choice} from '../vpn/lastChoice';

export const attributes = <T extends Choice | Record<string, string | number>>(
	data: T,
	prefix = '',
) =>
	getKeysAndValues(data)
		.map(
			({key, value}) =>
				` ${prefix + (key as string)}="${escapeHtml(`${value}`)}"`,
		)
		.join('');

export const connectionAttributes = <
	T extends Choice | Record<string, string | number>,
>(
	data: T,
) => attributes(data, 'data-');

export const describeButton = (title: string) =>
	attributes({
		title,
		'aria-label': title,
	});

export const connectionButton = <T extends Record<string, string | number>>(
	data: T,
) => `
	<button class="connection-button"${connectionAttributes(data)}>
		<span class="text">${c('Action').t`Connect`}</span>
		<svg viewBox="0 0 64 64" class="icon">
			<use xlink:href="img/icons.svg#connect"></use>
		</svg>
	</button>
`;
