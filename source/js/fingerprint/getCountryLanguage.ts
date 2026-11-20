import {getCountryCode} from '../tools/getCountryCode';

/**
 * Most common browser language for each country (where Proton VPN
 * servers are located), as a BCP 47 tag.
 *
 * In multilingual countries, or where browsers are commonly in English,
 * the most common browser setting is picked rather than the official
 * language.
 */
const countryLanguages: Record<string, string> = {
	AE: 'ar-AE',
	AL: 'sq-AL',
	AM: 'hy-AM',
	AO: 'pt-AO',
	AR: 'es-AR',
	AT: 'de-AT',
	AU: 'en-AU',
	AZ: 'az-AZ',
	BA: 'bs-BA',
	BD: 'bn-BD',
	BE: 'nl-BE',
	BG: 'bg-BG',
	BH: 'ar-BH',
	BO: 'es-BO',
	BR: 'pt-BR',
	BY: 'ru-BY',
	CA: 'en-CA',
	CH: 'de-CH',
	CL: 'es-CL',
	CN: 'zh-CN',
	CO: 'es-CO',
	CR: 'es-CR',
	CY: 'el-CY',
	CZ: 'cs-CZ',
	DE: 'de-DE',
	DK: 'da-DK',
	DZ: 'ar-DZ',
	EC: 'es-EC',
	EE: 'et-EE',
	EG: 'ar-EG',
	ES: 'es-ES',
	FI: 'fi-FI',
	FR: 'fr-FR',
	GB: 'en-GB',
	GE: 'ka-GE',
	GH: 'en-GH',
	GR: 'el-GR',
	GT: 'es-GT',
	HK: 'zh-HK',
	HN: 'es-HN',
	HR: 'hr-HR',
	HU: 'hu-HU',
	ID: 'id-ID',
	IE: 'en-IE',
	IL: 'he-IL',
	IN: 'en-IN',
	IQ: 'ar-IQ',
	IS: 'is-IS',
	IT: 'it-IT',
	JO: 'ar-JO',
	JP: 'ja-JP',
	KE: 'en-KE',
	KH: 'km-KH',
	KR: 'ko-KR',
	KW: 'ar-KW',
	KZ: 'ru-KZ',
	LB: 'ar-LB',
	LK: 'si-LK',
	LT: 'lt-LT',
	LU: 'fr-LU',
	LV: 'lv-LV',
	MA: 'fr-MA',
	MD: 'ro-MD',
	ME: 'sr-ME',
	MK: 'mk-MK',
	MM: 'my-MM',
	MN: 'mn-MN',
	MT: 'en-MT',
	MX: 'es-MX',
	MY: 'ms-MY',
	NG: 'en-NG',
	NL: 'nl-NL',
	NO: 'nb-NO',
	NP: 'ne-NP',
	NZ: 'en-NZ',
	PA: 'es-PA',
	PE: 'es-PE',
	PH: 'en-PH',
	PK: 'en-PK',
	PL: 'pl-PL',
	PR: 'es-PR',
	PT: 'pt-PT',
	PY: 'es-PY',
	QA: 'ar-QA',
	RO: 'ro-RO',
	RS: 'sr-RS',
	RU: 'ru-RU',
	SA: 'ar-SA',
	SE: 'sv-SE',
	SG: 'en-SG',
	SI: 'sl-SI',
	SK: 'sk-SK',
	TH: 'th-TH',
	TN: 'fr-TN',
	TR: 'tr-TR',
	TW: 'zh-TW',
	UA: 'uk-UA',
	US: 'en-US',
	UY: 'es-UY',
	UZ: 'uz-UZ',
	VE: 'es-VE',
	VN: 'vi-VN',
	ZA: 'en-ZA',
};

export interface SpoofedLanguage {
	/** navigator.language and default Intl locale */
	language: string;
	/** navigator.languages */
	languages: string[];
	/** Accept-Language HTTP header */
	acceptLanguage: string;
}

/**
 * Same list a fresh browser installed in this language would expose:
 * the regional tag, the base language, then English as a fallback.
 */
export const getLanguageList = (tag: string): string[] => {
	const base = tag.split('-')[0] as string;

	if (base === 'en') {
		return tag === 'en-US' ? ['en-US', 'en'] : [tag, 'en-US', 'en'];
	}

	return [tag, base, 'en-US', 'en'];
};

/**
 * Accept-Language quality values follow the browser own formula, so the
 * header looks like the one this browser would actually send:
 * - Chromium: 1, 0.9, 0.8, ...
 * - Firefox: evenly spread from 1 to 0 then rounded to 1 decimal
 */
export const getAcceptLanguage = (
	languages: string[],
	firefox: boolean,
): string =>
	languages
		.map((language, index) => {
			if (!index) {
				return language;
			}

			const quality = firefox
				? Math.round(10 - (10 * index) / languages.length) / 10
				: Math.max(1, 10 - index) / 10;

			return `${language};q=${quality}`;
		})
		.join(',');

/** Every language getCountryLanguage() can return, sorted (stable index) */
export const getKnownLanguages = (): string[] =>
	[...new Set(['en-US', ...Object.values(countryLanguages)])].sort();

export const getCountryLanguageTag = (country: string): string =>
	countryLanguages[getCountryCode(country)] || 'en-US';

export const getSpoofedLanguage = (
	language: string,
	firefox = false,
): SpoofedLanguage => {
	const languages = getLanguageList(language);

	return {
		language,
		languages,
		acceptLanguage: getAcceptLanguage(languages, firefox),
	};
};

export const getCountryLanguage = (
	country: string,
	firefox = false,
): SpoofedLanguage =>
	getSpoofedLanguage(getCountryLanguageTag(country), firefox);
