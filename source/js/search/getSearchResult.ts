import {countryFilteredList, CountryList, countryList} from '../components/countryList';
import {getSearchedLogicals} from './getSearchedLogicals';
import {c, msgid} from '../tools/translate';
import {cityList} from '../components/cityList';
import {formatGroup, torIcon} from '../components/serverGroup';
import {Logical} from '../vpn/Logical';
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
	secureCore = false,
): string => {
	if (simplifiedUi && userTier <= 0) {
		return '';
	}

	const expectedFeature = secureCore ? Feature.SECURE_CORE : 0;
	const logicals = flattenLogicalList(countries).filter(logical => (
		(logical.Features & Feature.SECURE_CORE) === expectedFeature &&
		logical.Name.toLowerCase().indexOf(searchText.toLowerCase()) !== -1
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

export const getSearchResult = (
	countries: CountryList,
	searchText: string,
	userTier: number,
	secureCore = {value: false},
): string => {
	const secureCoreEnabled = (userTier > 0 && secureCore.value);
	const searchWords = getWords(searchText);
	const withTor = (searchWords.indexOf('tor') !== -1);
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

	return ((!secureCoreEnabled && searchText.indexOf('#') !== -1
		? getLogicalListSearch(userTier, countries, searchText, secureCoreEnabled)
		: ''
	) + countryList(
		getSearchedLogicals(countries, searchWords, true, false),
		userTier,
		secureCore,
		count => /* translator: Header of a list of countries */ c('Label').plural(
			count,
			msgid`Country`,
			`Countries`,
		) + (count > 1 ? ' (' + count + ')' : ''),
	) + (secureCoreEnabled
		? ''
		: (cityListBlock + (withTor
			? getTorResult(
				countries,
				userTier,
				secureCoreEnabled,
			)
			: '')
		)
	)) || `<p class="not-found">
		${c('Error').t`No results found`}<br />
		<small>${c('Error').t`Please try a different keyword`}</small>
	</p>`;
};
