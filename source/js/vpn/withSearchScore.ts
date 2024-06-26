import {CountryItem} from '../components/countryList';
import {getSearchWordsScore} from '../tools/getSearchScore';
import {each} from '../tools/each';
import {Feature} from './Feature';
import {getWords} from '../tools/getWords';

const getSearchScoreForWords = (searchWords: string[], searchIn: any[]): number => getSearchWordsScore(
	searchWords,
	[...new Set(searchIn.filter(item => typeof item === 'string' && item !== '') as string[])],
);

export const withSearchScore = (
	source: CountryItem,
	countryScore: number,
	searchWords: string[],
	useCountryScore = true,
	useCityScore = true,
	withTor = false,
): CountryItem => {
	const groups: Record<string, CountryItem> = {};

	each(source.groups || {}, (key, value) => {
		const filteredGroup = withSearchScore(value, countryScore, searchWords, useCountryScore, useCityScore, withTor);

		if (filteredGroup.searchScore || filteredGroup.logicals?.length || filteredGroup.groups) {
			groups[key] = filteredGroup;
		}
	});

	const copy = {...source};
	delete copy.groups;
	delete copy.logicals;
	const torBitmap = withTor ? Feature.TOR : 0;

	return {
		...copy,
		searchScore: getSearchScoreForWords(searchWords, [
			...getWords(source.englishName),
			...getWords(source.name),
		]),
		...(useCityScore && source.logicals ? {
			logicals: source.logicals
				.filter(logical => (logical.Features & Feature.TOR) === torBitmap)
				.map(logical => ({
					...logical,
					SearchScore: getSearchScoreForWords(searchWords, [
						...getWords(logical.Name),
						logical.EntryCountry,
						logical.ExitCountry,
						...getWords(logical.City),
						...getWords(logical.Region),
						...Object.entries(logical.Translations || {}).reduce(
							(list, [key, sentence]) => useCountryScore || key !== 'EntryCountryName'
								? list.concat(getWords(sentence))
								: list,
							[] as string[],
						),
					]),
				}))
				.filter(logical => countryScore || logical.SearchScore >= searchWords.length)
		} : {}),
		...(Object.keys(groups).length ? {groups} : {}),
	};
};
