import {getSearchWordsScore} from '../tools/getSearchScore';
import {CountryList} from '../components/countryList';
import {each} from '../tools/each';
import {withSearchScore} from '../vpn/withSearchScore';
import {getWords} from '../tools/getWords';

export const getSearchedLogicals = (
	countries: CountryList,
	searchWords: string[],
	useCountryScore = true,
	useCityScore = true,
	withTor = false,
) => {
	const filteredCountries = {} as CountryList;

	each(countries, (countryCode, source) => {
		const countryScore = useCountryScore
			? getSearchWordsScore(searchWords, [...new Set([
				countryCode,
				...getWords(source.name),
				...getWords(source.englishName),
			])])
			: 0;

		const filteredSource = useCityScore
			? withSearchScore(source, countryScore, searchWords, useCountryScore, useCityScore, withTor)
			: source;

		if (countryScore < searchWords.length &&
			(!useCityScore || (!filteredSource?.logicals?.length && !filteredSource?.groups))
		) {
			return;
		}

		filteredCountries[countryCode] = {
			...filteredSource,
			score: countryScore,
		};
	});

	return filteredCountries;
};

