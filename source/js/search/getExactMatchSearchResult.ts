import type {Logical} from '../vpn/Logical';
import {c} from '../tools/translate';
import {serverList} from '../components/serverList';

export const getExactMatchSearchResult = (
	userTier: number,
	exactMatch: Logical | undefined,
) => (exactMatch
	? `<div class="exact-match"><div class="servers-group group-section">${c('Label').t`Exact match`}</div>${serverList(
		userTier,
		[exactMatch],
		c('Label').t`Exact match`,
		Boolean(exactMatch.Features & 1),
		true,
		{'no-sc-filter': 1},
	)}</div>`
	: ''
);
