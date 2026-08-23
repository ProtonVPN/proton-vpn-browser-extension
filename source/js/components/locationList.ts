import {c} from '../tools/translate';
import {countryList} from './countryList';
import {recentLocationsSlot} from './recentLocations';
import {countryListHeader} from './countryListHeader';
import {getLastChoices} from '../vpn/lastChoice';
import type {CountryList} from './countryList';
import type {Recents} from '../vpn/features/Recents';
import type {LoadedFeature} from '../vpn/features/loadAllFeatures';
import type {UserContext} from '../account/user/UserContext';

export const locationList = async (
	countries: CountryList,
	userContext: UserContext,
	secureCore: {value: boolean},
	recents: LoadedFeature<Recents>,
) => {
	return (
		(userContext.tier > 0 && recents.config.value
			? recentLocationsSlot(await getLastChoices(), countries)
			: '') +
		(countryList(countries, userContext, secureCore, countryListHeader, true) ||
			`<p class="not-found">
				${c('Error').t`Unable to load the list`}<br />
				<small>${
					/* translator: maybe internet connection is unstable, Wi-Fi too far, or API domain got censored by the ISP or country */
					c('Error').t`Please check your connectivity`
				}</small>
			</p>`)
	);
};
