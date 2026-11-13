import {each} from '../tools/each';
import {writeFile} from 'fs';

const localDirectory = __dirname + '/../../locales/';

const en: {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	contexts: Record<string, Record<string, any>>;
} = require(localDirectory + 'en_US.json');

['fr_FR'].forEach((locale) => {
	const localeFile = localDirectory + locale + '.json';
	const translations: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		contexts: Record<string, Record<string, any>>;
	} = require(localeFile);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const flatTranslations: Record<string, any> = {};

	each(translations.contexts, (_, values) => {
		each(values, (id, value) => {
			flatTranslations[id] = value;
		});
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const contexts: Record<string, Record<string, any>> = {};

	each(en.contexts, (context, values) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const newTranslations: Record<string, any> = {};

		each(values, (id, value) => {
			newTranslations[id] =
				translations.contexts[context]?.[id] || flatTranslations[id] || value;
		});

		contexts[context] = newTranslations;
	});

	translations.contexts = contexts;

	writeFile(
		localeFile,
		JSON.stringify(translations, null, '\t').trim() + '\n',
		(err) => {
			if (err) {
				throw err;
			}

			console.log('Translations updated for ' + locale);
		},
	);
});
