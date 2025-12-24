import {c} from '../tools/translate';

export const getNoResultBlock = () => `<p class="not-found">
	${c('Error').t`No results found`}<br />
	<small>${c('Error').t`Please try a different keyword`}</small>
</p>`;
