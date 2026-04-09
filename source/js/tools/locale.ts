import {BackgroundData} from '../messaging/MessageType';
import {getRuntime} from './getRuntime';

const root = global || window;
let registeredLocale: string | undefined = undefined;

const getNavigator = (): (Navigator & {userLanguage?: string}) | undefined =>
	root.navigator;

export const getLanguage = () =>
	registeredLocale?.substring(0, 2) ||
	getNavigator()?.language ||
	getNavigator()?.userLanguage;

export const getLanguages = () =>
	[getLanguage(), ...(getNavigator()?.languages || [])].filter(Boolean);

export const getPrimaryLanguage = () =>
	`${getLanguage() || 'en'}`.split(/[_-]/)[0] || 'en';

/* eslint-disable */
export const getLocaleForLanguage = (language: string): string => {
	language ||= 'en';

	return ({
		ar: 'ar_SA',
		be: 'be_BY',
		ca: 'ca_ES',
		cs: 'cs_CZ',
		da: 'da_DK',
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
		zh: 'zh_CN',
	})[language] || (language + '_' + language.toUpperCase());
};
/* eslint-enable */

export const getLocale = (): string => {
	if (registeredLocale && registeredLocale.length > 2) {
		return registeredLocale;
	}

	const sourceLanguage = getLanguage();

	if (typeof sourceLanguage !== 'string' || !sourceLanguage) {
		return 'en_US';
	}

	const language = sourceLanguage.replace('-', '_');

	if (language.includes('_')) {
		return language;
	}

	return getLocaleForLanguage(language);
};

export const registerLocale = (locale: string | undefined) => {
	registeredLocale = locale;
};

getRuntime()?.onMessage.addListener((message: any) => {
	if (message?.type === BackgroundData.LOCALE) {
		registeredLocale = message.data?.locale;
	}
});
