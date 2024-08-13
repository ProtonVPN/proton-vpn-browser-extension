// @ts-ignore
import {getPluralFunc as getPluralFn} from 'plural-forms/minimal-safe';
import {each} from './each';

interface TranslationConfig {
	headers?: Record<string, string>;
	contexts?: Record<string, Record<string, string[]>>;
}

let currentTranslations: {
	headers?: Record<string, string>;
	contexts?: Record<string, Record<string, {key: string, value: string[]}>>;
} = {};

const variablePlaceholder = '${}';

const variableOrder: Record<string, string[]> = {};

const calculateVariableOrder = (key: string): string[] => {
	const variables: string[] = [];

	key.replace(
		/\$\{[^}]+}/g,
		variable => {
			variables.push(variable.substring(2, variable.length - 1).trim());

			return '';
		},
	);

	return variables;
};

export const translateArea = (area: ParentNode): void => {
	['svg > title', '[data-trans]'].forEach(selector => {
		area.querySelectorAll(selector).forEach(element => {
			element.innerHTML = getTranslation(
				element.getAttribute('data-context') || 'Info',
				([value]) => value,
				[element.innerHTML.trim().replace(/\n\t+/g, '\n')],
			);
		});
	});
};

export const getTranslation = (
	context: string,
	pluralFunction: (value: (string | undefined)[]) => string | undefined,
	template: TemplateStringsArray | string[],
	args: any[] = [],
	plurals: string[] = [],
): string => {
	const id = template.join(variablePlaceholder);
	const translations = currentTranslations.contexts?.[context]?.[id];

	if (translations) {
		const {key, value} = translations;
		const order = variableOrder[key] || (variableOrder[key] = calculateVariableOrder(key));
		const translatedValue = pluralFunction(value);

		if (translatedValue) {
			return translatedValue.replace(
				/\$\{[^}]+}/g,
				variable => {
					const index = order.indexOf(variable.substring(2, variable.length - 1).trim());

					return args[index] !== undefined ? args[index] : '';
				},
			);
		}
	}

	return (pluralFunction && pluralFunction([undefined, ...plurals])) || template.reduce(
		(str, chunk, index) => str + chunk + (args[index] !== undefined ? args[index] : ''),
		'',
	);
};

class MessageId {
	constructor(
		public readonly template: TemplateStringsArray,
		public readonly args: any[],
	) {
	}
}

export const msgid = (template: TemplateStringsArray, ...args: any[]) => new MessageId(template, args);

let currentPluralFunc: Function | undefined = undefined;

export class Context {
	constructor(private context: string) {
	}

	t(template: TemplateStringsArray, ...args: any): string {
		return getTranslation(this.context, ([value]) => value, template, args);
	}

	plural(count: number, template: MessageId, ...plurals: string[]): string {
		return getTranslation(this.context, values => {
			if (currentPluralFunc) {
				return currentPluralFunc(count, values);
			}

			return values[Math.abs(count) === 1 ? 0 : 1];
		}, template.template, template.args, plurals);
	}
}

export const c = (context: string) => new Context(context);

const pluralFnBody = (pluralStr: string) => `return args[+ (${pluralStr})];`;

const fnCache: Record<string, Function> = {};

export const makePluralFunc = (pluralStr: string): Function => {
	return fnCache[pluralStr] || (fnCache[pluralStr] = new Function('n', 'args', pluralFnBody(pluralStr)));
};

const pluralRegex = /\splural ?=?([\s\S]*);?/;

export const getPluralFunc = (headers?: Record<string, string>): string => {
	const pluralFormsHeader = headers?.['plural-forms'] || 'nplurals=2; plural=(n != 1);';
	let pluralFn = pluralRegex.exec(pluralFormsHeader)?.[1];

	if (pluralFn && pluralFn[pluralFn.length - 1] === ';') {
		pluralFn = pluralFn.slice(0, -1);
	}

	return pluralFn || 'plural=(n != 1)';
};

const setCurrentTranslations = (locale: string, config: TranslationConfig) => {
	const contexts: Record<string, Record<string, {key: string, value: string[]}>> = {};

	each(config.contexts || {}, (context, values) => {
		const translations: Record<string, {key: string, value: string[]}> = {};

		each(values, (key, value) => {
			translations[key.replace(/\$\{[^}]+}/g, variablePlaceholder)] = {key, value};
		});

		contexts[context] = translations;
	});

	currentTranslations = {
		headers: config.headers || {},
		contexts,
	};

	const headers = config.headers;
	currentPluralFunc = getPluralFn(headers?.['language'] || locale)
		|| makePluralFunc(getPluralFunc(headers));
};

const loadTranslations = async (locale: string) => {
	switch (locale) {
		case 'es_419':
		case 'es_AR':
		case 'es_CL':
		case 'es_DO':
		case 'es_MX':
			locale = 'es_LA';
			break;
	}

	setCurrentTranslations(locale, await (await fetch('/locales/' + locale + '.json')).json());
};

export const fetchTranslations = async () => {
	const locale = getLocale();

	if (locale === 'en_US') {
		setCurrentTranslations(locale, {});

		return;
	}

	try {
		await loadTranslations(locale);
	} catch (e) {
		const fallbackLocale = getLocaleForLanguage(locale.split('_')[0] || '');

		if (fallbackLocale === locale) {
			setCurrentTranslations(locale, {});

			return;
		}

		try {
			await loadTranslations(fallbackLocale);
		} catch (e) {
			setCurrentTranslations('en_US', {});
		}
	}
}

export const getLanguage = () => navigator.language || (navigator as any).userLanguage;

export const getPrimaryLanguage = () => (`${getLanguage() || 'en'}`).split(/[_-]/)[0] || 'en';

const getStringListFromDataSet = (key: string, data: DOMStringMap | undefined): string[] => {
	const value = data?.[key];

	if (!value) {
		return [];
	}

	try {
		const parsedValue = JSON.parse(value);

		return parsedValue instanceof Array ? parsedValue : [];
	} catch (e) {
		return [];
	}
};

export const getLocaleSupport = (data: DOMStringMap | undefined): string[] => {
	return getStringListFromDataSet('localeSupport', data);
};

export const getHashSeed = (data: DOMStringMap | undefined): string[] => {
	return getStringListFromDataSet('hashSeed', data);
};

const getLocaleForLanguage = (language: string): string => {
	return ({
		be: 'be_BY',
		ca: 'ca_ES',
		cs: 'cs_CZ',
		el: 'el_GR',
		en: 'en_US',
		hi: 'hi_IN',
		ja: 'ja_JP',
		ka: 'ka_GE',
		ko: 'ko_KR',
		nb: 'nb_NO',
		nn: 'nb_NO',
		no: 'nb_NO',
		pt: 'pt_BR',
		sl: 'sl_SI',
		sv: 'sv_SE',
		uk: 'uk_UA',
		vi: 'vi_VN',
	})[language] || (language + '_' + language.toUpperCase());
};

const getLocale = (): string => {
	const sourceLanguage = getLanguage();

	if (typeof sourceLanguage !== 'string' || !sourceLanguage) {
		return 'en_US';
	}

	const language = sourceLanguage.replace('-', '_');

	if (language.indexOf('_') !== -1) {
		return language;
	}

	return getLocaleForLanguage(language);
};

export const getCountryName = (country: string, language?: string): string | undefined => {
	country = country.toUpperCase();
	country = {UK: 'GB'}[country] || country;
	const languages = [`${language || getLanguage()}`];
	const shortName = new Intl.DisplayNames(languages, {type: 'region', style: 'short'}).of(country);

	switch (languages[0]?.split(/[_-]/)[0]) {
		case 'jp':
		case 'zh':
			return shortName;
	}

	const longName = new Intl.DisplayNames(languages, {type: 'region'}).of(country);

	if (shortName && longName && shortName.length < 6 && longName.length < 14) {
		return longName;
	}

	return shortName;
};

export const getCountryNameOrCode = (
	country: string,
	language?: string,
): string => getCountryName(country, language) || country;

interface NumberFormatOptions {
	localeMatcher?: string | undefined;
	style?: string | undefined;
	currency?: string | undefined;
	currencyDisplay?: string | undefined;
	currencySign?: string | undefined;
	useGrouping?: boolean | undefined;
	minimumIntegerDigits?: number | undefined;
	minimumFractionDigits?: number | undefined;
	maximumFractionDigits?: number | undefined;
	minimumSignificantDigits?: number | undefined;
	maximumSignificantDigits?: number | undefined;
}

export const getNumberFormatter = (options?: NumberFormatOptions) => new Intl.NumberFormat('en-US', options);
