import {each} from '../tools/each';
import {writeFile} from 'fs';

const localDirectory = __dirname + '/../../locales/';

const en: {
	contexts: Record<string, Record<string, any>>,
} = require(localDirectory + 'en_US.json');

['fr_FR'].forEach(locale => {
	const localeFile = localDirectory + locale + '.json';
	const translations: {
		contexts: Record<string, Record<string, any>>,
	} = require(localeFile);
	const flatTranslations: Record<string, any> = {};

	each(translations.contexts, (_, values) => {
		each(values, (id, value) => {
			flatTranslations[id] = value;
		});
	});

	const contexts: Record<string, Record<string, any>> = {};

	each(en.contexts, (context, values) => {
		const newTranslations: Record<string, any> = {};

		each(values, (id, value) => {
			newTranslations[id] = translations.contexts[context]?.[id] || flatTranslations[id] || value;
		});

		contexts[context] = newTranslations;
	});

	translations.contexts = contexts;

	writeFile(localeFile, JSON.stringify(translations, null, '\t'), err => {
		if (err) {
			throw err;
		}

		console.log('Translations updated for ' + locale);
	});
});
