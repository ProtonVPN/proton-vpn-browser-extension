import {c} from '../tools/translate';
import {describeButton} from './connectionButton';

export const via = (
	classes = '',
) => `<span class="via-country ${classes}" ${describeButton(
	/* translator: Tooltip/vocalization for the >> symbol between the entry country flag and the exit country flag when using Secure Core, for instance to connect to Sweden via Switzerland */
	c('Label').t`Via`,
)}><svg viewBox="0 0 24 24" fill="currentColor">
	<use xlink:href="img/icons.svg#via"></use>
</svg></span>`;
