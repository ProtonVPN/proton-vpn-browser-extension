import {c, getCountryName, getCountryNameOrCode} from '../tools/translate';
import {ucfirst} from '../tools/ucfirst';
import type {Logical} from './Logical';
import type {CountryList} from '../components/countryList';
import {Feature} from './Feature';

export const attachLogicalIntoCountryList = (
	userTier: number,
	logical: Logical,
	countries: CountryList,
) => {
	const country = logical.ExitCountry;

	logical.EntryCountryName = getCountryName(logical.EntryCountry, 'en');

	if (!logical.Translations) {
		logical.Translations = {};
	}

	logical.Translations.EntryCountryName = getCountryName(logical.EntryCountry);
	const isSecureCore = logical.Features & Feature.SECURE_CORE;
	const groupType = isSecureCore
		? 'secureCore'
		: logical.City
			? 'city'
			: logical.Features & Feature.TOR
				? 'tor'
				: logical.Tier < 1
					? 'free'
					: 'other';
	const groupEnglishName =
		(!isSecureCore && logical.City) || ucfirst(groupType);
	const groupName = isSecureCore
		? c('Info').t`Secure Core`
		: logical.Translations?.City ||
			logical.City ||
			(
				{
					tor: 'TOR',
					free: /* translator: it's for free servers that can be accessed without paid subscription */ c(
						'Label',
					).t`Free`,
				} as Record<typeof groupType, string>
			)[groupType] ||
			/* translator: server fallback type */ c('Label').t`Other`;

	const infos =
		countries[country] ||
		(countries[country] = {
			englishName: getCountryNameOrCode(country, 'en'),
			name: getCountryNameOrCode(country),
			needUpgrade: true,
			groups: {},
		});

	if (!infos.groups) {
		infos.groups = {};
	}

	infos.needUpgrade = infos.needUpgrade && userTier < logical.Tier;

	const group =
		infos.groups[groupEnglishName] ||
		(infos.groups[groupEnglishName] = {
			type: groupType,
			englishName: groupEnglishName,
			name: groupName,
			needUpgrade: true,
			logicals: [],
		});
	group.needUpgrade = group.needUpgrade && userTier < logical.Tier;
	(group.logicals || (group.logicals = [])).push(logical);
};
