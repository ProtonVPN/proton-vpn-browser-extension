import {c} from '../tools/translate';

export const via = (classes = '') =>`<span class="via-country ${classes}" title="${
	/* translator: Tooltip/vocalization for the >> symbol between the entry country flag and the exit country flag when using Secure Core, for instance to connect to Sweden via Switzerland */
	c('Label').t`Via`
}"><svg aria-label="»" viewBox="0 0 24 24" fill="currentColor">
	<use xlink:href="img/icons.svg#via"></use>
</svg></span>`;
