import {c, msgid} from '../tools/translate';
import {getServersCount} from '../vpn/getServersCount';
import {getAccessSentence} from '../tools/upsell';
import {catchPromise} from '../tools/triggerPromise';

/**
 * This function updates the `.access-sentence` title on the `upgrade` page with the number of servers and countries.
 */
export const updateAccessSentenceWithCounts = (area: HTMLDivElement | Document) => catchPromise((async () => {
	const {
		Servers: servers,
		Countries: countries,
	} = await getServersCount();

	const serversCount = Math.floor(servers / 100) * 100;

	area.querySelectorAll<HTMLElement>('.access-sentence').forEach(paragraph => {
		paragraph.innerText = getAccessSentence(
			/**
			 * 	translator: ${serversCount} is a number so output is like "1900 secure servers" and this goes in sentence such as "Access over 5000 secure servers in 63 countries"
			 */
			c('Error').plural(serversCount, msgid`${serversCount} secure server`, `${serversCount} secure servers`),
			/**
			 * 	translator: ${countries} is a number so output is like "63 countries" and this goes in sentence such as "Access over 5000 secure servers in 63 countries"
			 */
			c('Error').plural(countries, msgid`${countries} country`, `${countries} countries`),
		);
	});
})());
