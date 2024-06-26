import {comp, Sorter} from '../tools/comp';
import {countryBlock} from './countryBlock';
import {Logical} from '../vpn/Logical';
import {getKeys} from '../tools/getKeys';
import {getSecureCorePredicate} from '../vpn/getSecureCorePredicate';

export type CountryList = Record<string, CountryItem>;

export type CountryItem = {
	type?: 'city' | 'tor' | 'secureCore' | 'free' | 'other';
	name: string;
	englishName: string;
	needUpgrade: boolean;
	score?: number;
	logicals?: Logical[];
	groups?: CountryList;
	searchScore?: number;
};

const sorter = new Sorter<string, CountryItem>(
	(name: string, countries: CountryList) => countries[name],
)
	.asc('needUpgrade')
	.desc('searchScore')
	.desc('score')
	.asc('name');

export const sortGroups = (countries: CountryList): CountryList => {
	const keys = getKeys(countries);

	sorter.sort(keys, countries);

	const sortedCountries: CountryList = {};

	keys.forEach(key => {
		sortedCountries[key] = countries[key] as CountryItem;
	});

	return sortedCountries;
};

export const getCountryFilteredKeys = (
	countries: CountryList,
	predicate: (logical: Logical) => boolean,
) => {
	const groupPredicate = (group: CountryItem | undefined): boolean => (group?.logicals || []).some(predicate)
		|| Object.values(group?.groups || {}).some(group => groupPredicate(group));

	return getKeys(countries)
		.filter(country => groupPredicate(countries[country]));
};

export const countryFilteredList = (
	countries: CountryList,
	userTier: number,
	predicate: (logical: Logical) => boolean,
	header?: (count: number) => string,
	secureCoreValue = false,
	extraConnectionAttributes: Record<string, string | number> = {},
	showFlag = false,
): string => {
	const keys = getCountryFilteredKeys(countries, predicate);

	const count = keys.length;

	if (count === 0) {
		return '';
	}

	sorter.sort(keys, countries);

	return (header
		? `<div class="servers-group group-section">${header(count)}</div>`
		: ''
	) + keys.map(country => countryBlock(
		userTier,
		country,
		countries[country] as CountryItem,
		(logicals: Logical[]) => logicals
			.filter(predicate)
			.sort(
				(a, b) => comp(userTier < a.Tier, userTier < b.Tier)
					|| comp(b.SearchScore, a.SearchScore)
					|| comp(a.Name, b.Name),
			),
		userTier > 0 && secureCoreValue,
		extraConnectionAttributes,
		showFlag,
	)).join('');
};

export const countryList = (
	countries: CountryList,
	userTier: number,
	secureCore = {value: false},
	header?: (count: number) => string,
) => {
	return countryFilteredList(
		countries,
		userTier,
		getSecureCorePredicate(userTier, secureCore),
		header,
		userTier > 0 && secureCore.value,
	);
};
