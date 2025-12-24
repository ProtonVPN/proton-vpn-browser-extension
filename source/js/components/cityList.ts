import {comp} from '../tools/comp';
import type {Logical} from '../vpn/Logical';
import {type CountryList, type CountryItem, getCountryFilteredKeys, sortGroups} from './countryList';
import {getSecureCorePredicate} from '../vpn/getSecureCorePredicate';
import {getServerGroups} from './serverGroup';
import {getCountryFlag} from '../tools/getCountryFlag';
import {each} from '../tools/each';
import {via} from './via';

export const cityList = (
	countries: CountryList,
	userTier: number,
	secureCore = {value: false},
	header?: (count: number) => string,
) => {
	const secureCorePredicate = getSecureCorePredicate(userTier, secureCore);
	const countryCodes: string[] = getCountryFilteredKeys(countries, secureCorePredicate);

	if (countryCodes.length === 0) {
		return '';
	}

	const splitGroups: CountryList = {};

	countryCodes.forEach((countryCode: string) => {
		const source = countries[countryCode] as CountryItem;

		if (!source.groups) {
			splitGroups[countryCode] = source;

			return;
		}

		each(source.groups, (name, group) => {
			splitGroups[countryCode + '|' + name] = {
				name: group.name,
				englishName: group.englishName,
				needUpgrade: group.needUpgrade,
				type: group.type,
				score: group.score,
				searchScore: group.searchScore,
				groups: {[name]: group},
			};
		});
	});

	const cities: string[] = [];

	each(sortGroups(splitGroups), (key, source) => {
		const countryCode = key.split('|')[0] as string;
		const secureCoreGroup = userTier > 0 && secureCore.value && source.groups?.['SecureCore'];
		const item = (secureCoreGroup
			? {
				...source,
				groups: {
					...source.groups,
					SecureCore: {
						...secureCoreGroup,
						name: (secureCoreGroup?.logicals?.[0]?.EntryCountry
							? `${via('top-small')} ${getCountryFlag(secureCoreGroup.logicals[0].ExitCountry)}`
							: ''
						) + source.name,
						englishName: source.englishName,
					},
				},
			}
			: source
		) as CountryItem;

		cities.push(...getServerGroups(
			userTier,
			countryCode,
			item,
			(logicals: Logical[]) => logicals
				.filter(secureCorePredicate)
				.sort(
					(a, b) => comp(userTier < a.Tier, userTier < b.Tier)
						|| comp(b.SearchScore, a.SearchScore)
						|| comp(a.Name, b.Name),
				),
			userTier > 0 && secureCore.value,
			false,
			true,
		).filter(Boolean));
	});

	const count = cities.length;

	if (count === 0) {
		return '';
	}

	return (header
		? `<div class="servers-group group-section">${header(count)}</div>`
		: ''
	) + cities.join('');
}
