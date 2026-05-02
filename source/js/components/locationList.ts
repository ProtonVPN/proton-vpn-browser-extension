import {c} from '../tools/translate';
import {countryList} from './countryList';
import {recentLocationsSlot} from './recentLocations';
import {countryListHeader} from './countryListHeader';
import {getLastChoices} from '../vpn/lastChoice';
import type {CountryList} from './countryList';
import type {Recents} from '../vpn/features/Recents';
import type {LoadedFeature} from '../vpn/features/loadAllFeatures';

export const locationList = async (
	countries: CountryList,
	userTier: number,
	secureCore: {value: boolean},
	recents: LoadedFeature<Recents>,
) => {
	return (
		(userTier > 0 && recents.config.value
			? recentLocationsSlot(await getLastChoices(), countries)
			: '') +
		(countryList(countries, userTier, secureCore, countryListHeader, true) ||
			`<p class="not-found">
				${c('Error').t`Unable to load the list`}<br />
				<small>${
					/* translator: maybe internet connection is unstable, Wi-Fi too far, or API domain got censored by the ISP or country */
					c('Error').t`Please check your connectivity`
				}</small>
			</p>`)
	);
};
