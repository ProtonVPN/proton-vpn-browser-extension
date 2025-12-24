import {countryFilteredList, type CountryList, countryList} from '../components/countryList';
import {getSearchedLogicals} from './getSearchedLogicals';
import {getExactMatchSearchResult} from './getExactMatchSearchResult';
import {getNoResultBlock} from './getNoResultBlock';
import {c, msgid} from '../tools/translate';
import {cityList} from '../components/cityList';
import {formatGroup, torIcon} from '../components/serverGroup';
import type {Logical} from '../vpn/Logical';
import {Feature} from '../vpn/Feature';
import {comp} from '../tools/comp';
import {getWords} from '../tools/getWords';
import {getSearchWordsScore} from '../tools/getSearchScore';
import {each} from '../tools/each';
import {simplifiedUi} from '../config';

const getTorResult = (
	countries: CountryList,
	userTier: number,
	secureCoreValue = false,
) => {
	const expectedFeature = Feature.TOR | (userTier > 0 && secureCoreValue ? Feature.SECURE_CORE : 0);

	return countryFilteredList(
		countries,
		userTier,
		(logical: Logical) => (logical.Features & expectedFeature) === expectedFeature,
		count => `<span class="label-icon-container">${torIcon}</span>` + /* translator: Header of a list of countries */ c('Label').plural(
			count,
			msgid`Country`,
			`Countries`,
		) + (count > 1 ? ' (' + count + ')' : ''),
		secureCoreValue,
		{subGroup: 'tor'},
		true,
	);
};

const flattenLogicalList = (countries: CountryList): Logical[] => {
	const list: Logical[] = [];

	each(countries, (_, value) => {
		if (value.logicals) {
			list.push(...value.logicals);
		}

		if (value.groups) {
			list.push(...flattenLogicalList(value.groups));
		}
	});

	return list;
};

const getLogicalListSearch = (
	userTier: number,
	countries: CountryList,
	searchText: string,
	exactMatch: Logical | undefined,
	secureCore = false,
): string => {
	if (simplifiedUi && userTier <= 0) {
		return '';
	}

	const expectedFeature = secureCore ? Feature.SECURE_CORE : 0;
	const logicals = flattenLogicalList(countries).filter(logical => (
		(logical.Features & Feature.SECURE_CORE) === expectedFeature &&
		(!exactMatch || exactMatch.ID !== logical.ID) &&
		logical.Name.toLowerCase().includes(searchText.toLowerCase())
	));

	const count = logicals.length;

	if (!count) {
		return '';
	}

	if (searchText) {
		const searchWords = getWords(searchText);
		logicals.sort((a, b) => comp(
			getSearchWordsScore(searchWords, [b.Name]),
			getSearchWordsScore(searchWords, [a.Name]),
		));

		return formatGroup(userTier, logicals, secureCore, {}, true, 'logicals-search');
	}

	return formatGroup(userTier, logicals, secureCore, {}, false, 'logicals-search');
};

/** Has a # in it which is not the first or last character */
const looksLikeServerName = (search: string) => /^.+#./.test(search);

const findInCountryList = (countries: CountryList, name: string): Logical | undefined => {
	for (const countryItem of Object.values(countries)) {
		const result = countryItem.logicals?.find(
			logical => logical.Name.toUpperCase() === name,
		) || findInCountryList(countryItem.groups || {}, name);

		if (result) {
			return result;
		}
	}

	return undefined;
};

const getSearchAsynchronousResult = () => `<div class="lookup-result"><div class="spinner">
	<div class="lds-ring"><div></div><div></div><div></div><div></div></div>
</div></div>`;

const getSearchSynchronousResult = (
	countries: CountryList,
	searchText: string,
	userTier: number,
	secureCore = {value: false},
): string => {
	const secureCoreEnabled = (userTier > 0 && secureCore.value);
	const searchWords = getWords(searchText);
	const withTor = (searchWords.includes('tor'));
	const cityListContent = cityList(
		getSearchedLogicals(countries, searchWords, false, true),
		userTier,
		secureCore,
		secureCoreEnabled
			? undefined
			: (count => /* translator: Header of a list of cities */ c('Label').plural(
				count,
				msgid`City`,
				`Cities`,
			) + (count > 1 ? ' (' + count + ')' : '')),
	);
	const cityListBlock = secureCoreEnabled
		? (cityListContent && `<div class="secure-core-search">${cityListContent}</div>`)
		: cityListContent;
	const couldBeServerName = looksLikeServerName(searchText);
	const exactMatch = couldBeServerName
		? findInCountryList(countries, searchText.toUpperCase())
		: undefined;

	return getExactMatchSearchResult(userTier, exactMatch)
		+ (!secureCoreEnabled && couldBeServerName
			? getLogicalListSearch(userTier, countries, searchText, exactMatch, secureCoreEnabled)
			: ''
		)
		+ countryList(
			getSearchedLogicals(countries, searchWords, true, false),
			userTier,
			secureCore,
			count => /* translator: Header of a list of countries */ c('Label').plural(
				count,
				msgid`Country`,
				`Countries`,
			) + (count > 1 ? ' (' + count + ')' : ''),
		)
		+ (secureCoreEnabled
			? ''
			: (cityListBlock + (withTor
				? getTorResult(
					countries,
					userTier,
					secureCoreEnabled,
				)
				: '')
			)
		)
		+ ((couldBeServerName && !exactMatch)
			? getSearchAsynchronousResult()
			: ''
		);
};

export const getSearchResult = (
	countries: CountryList,
	searchText: string,
	userTier: number,
	secureCore = {value: false},
): string => getSearchSynchronousResult(countries, searchText, userTier, secureCore) || getNoResultBlock();
