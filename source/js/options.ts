import {fetchTranslations, translateArea} from './tools/translate';

fetchTranslations().then(() => {
	translateArea(document);
});
