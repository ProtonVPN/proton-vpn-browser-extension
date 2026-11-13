'use popup';
import type {CountryList} from '../countryList';
import {getCountryNameOrCode} from '../../tools/translate';
import type {Cities} from '../../vpn/getCities';
import {getCities, mergeTranslations} from '../../vpn/getCities';
import {readSession} from '../../account/readSession';
import type {Logical} from '../../vpn/Logical';
import {each} from '../../tools/each';
import {setText} from '../setText';

export const watchLanguageChange = (
	window: Window,
	area: HTMLElement,
	getLogicals: () => Logical[],
	countries: CountryList,
	cities: Cities,
): void => {
	mergeTranslations(getLogicals(), cities);

	window.addEventListener('languagechange', async () => {
		const cities = await getCities((await readSession()).uid);
		mergeTranslations(getLogicals(), cities);

		each(countries, (countryCode, countryItem) => {
			countryItem.name = getCountryNameOrCode(countryCode);
		});

		area.querySelectorAll<HTMLSpanElement>('.city-name').forEach((city) => {
			const englishName = city.getAttribute('data-english-city-name');
			const countryCode = city.getAttribute('data-country-code');

			if (!englishName || !countryCode) {
				return;
			}

			setText(city, (cities[countryCode] || {})[englishName] || englishName);
		});

		area
			.querySelectorAll<HTMLSpanElement>('.country-name')
			.forEach((country) => {
				setText(
					country,
					getCountryNameOrCode(`${country.getAttribute('data-country-code')}`),
				);
			});
	});
};
