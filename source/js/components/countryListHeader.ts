import {c, msgid} from '../tools/translate';

export const countryListHeader = (count: number) =>
	/* translator: Header of a list of countries */ c('Label').plural(
		count,
		msgid`Country`,
		`Countries`,
	) + (count > 1 ? ' (' + count + ')' : '');
