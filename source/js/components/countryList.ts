import {countryBlock} from './countryBlock';
import {connectionAttributes, describeButton} from './connectionButton';
import {via} from './via';
import {comp, Sorter} from '../tools/comp';
import {getKeys} from '../tools/getKeys';
import {c} from '../tools/translate';
import type {Logical} from '../vpn/Logical';
import {getSecureCorePredicate} from '../vpn/getSecureCorePredicate';
import {Feature} from '../vpn/Feature';

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

	keys.forEach((key) => {
		sortedCountries[key] = countries[key] as CountryItem;
	});

	return sortedCountries;
};

export const getCountryFilteredKeys = (
	countries: CountryList,
	predicate: (logical: Logical) => boolean,
) => {
	const groupPredicate = (group: CountryItem | undefined): boolean =>
		(group?.logicals || []).some(predicate) ||
		Object.values(group?.groups || {}).some((group) => groupPredicate(group));

	return getKeys(countries).filter((country) =>
		groupPredicate(countries[country]),
	);
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

	return (
		(header
			? `<div class="servers-group group-section">${header(count)}</div>`
			: '') +
		`<div class="country-block">
			<div class="details-box ">
				<div class="details-box-summary connection-button-container">
					<div class="country-header list-item-box">
						<button
							class="flex flex-1 text-left button-light-hover connect-option connect-clickable"
							${describeButton(c('Action: Country-level button').t`Connect to the fastest country`)}
							${connectionAttributes({
								pick: 'fastest',
								[secureCoreValue ? 'requiredFeatures' : 'excludedFeatures']:
									Feature.SECURE_CORE,
							})}
						>
							${secureCoreValue ? `<div class="via-box">${via()}</div>` : ''}
							<div class="lightning">
								<svg class="lightning-symbol" viewBox="0 0 10 14">
									<use xlink:href="img/icons.svg#lightning"></use>
								</svg>
							</div>
							<div class="flex-1 group-name recent-name">
								${c('Title').t`Fastest country`}
							</div>
							<div class="flex-1 connect-text">
								${c('Action').t`Connect`}
							</div>
						</button>
					</div>
				</div>
			</div>
		</div>` +
		keys
			.map((country) =>
				countryBlock(
					userTier,
					country,
					countries[country] as CountryItem,
					(logicals: Logical[]) =>
						logicals
							.filter(predicate)
							.sort(
								(a, b) =>
									comp(userTier < a.Tier, userTier < b.Tier) ||
									comp(b.SearchScore, a.SearchScore) ||
									comp(a.Name, b.Name),
							),
					userTier > 0 && secureCoreValue,
					extraConnectionAttributes,
					showFlag,
				),
			)
			.join('')
	);
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
