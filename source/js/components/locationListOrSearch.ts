import {getSearchResult} from '../search/getSearchResult';
import {locationList} from './locationList';
import type {AllFeatures} from '../vpn/features/AllFeatures';
import type {CountryList} from './countryList';
import type {UserContext} from '../account/user/UserContext';

export const locationListOrSearch = async (
	searchText: string,
	countries: CountryList,
	userContext: UserContext,
	features: AllFeatures,
) => {
	if (searchText === '') {
		return await locationList(
			countries,
			userContext,
			features.secureCore.config,
			features.recents,
		);
	}

	return getSearchResult(
		countries,
		searchText,
		userContext,
		features.secureCore.config,
	);
};
