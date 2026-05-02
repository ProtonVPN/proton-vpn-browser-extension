import {getSearchResult} from '../search/getSearchResult';
import {locationList} from './locationList';
import type {AllFeatures} from '../vpn/features/AllFeatures';
import type {CountryList} from './countryList';

export const locationListOrSearch = async (
	searchText: string,
	countries: CountryList,
	userTier: number,
	features: AllFeatures,
) => {
	if (searchText === '') {
		return await locationList(
			countries,
			userTier,
			features.secureCore.config,
			features.recents,
		);
	}

	return getSearchResult(
		countries,
		searchText,
		userTier,
		features.secureCore.config,
	);
};
