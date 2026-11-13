'use popup';
import {attachLogicalIntoCountryList} from '../../vpn/attachLogicalIntoCountryList';
import type {Logical} from '../../vpn/Logical';
import type {CountryList} from '../countryList';

export const prepareCountryList = (
	userTier: number,
	hasAccessToPaidServers: boolean,
	logicals: Logical[],
	countries: CountryList,
	freeCountries: Record<string, true>,
) => {
	logicals.forEach((logical) => {
		// Don't bother paid users with free servers
		if (hasAccessToPaidServers && logical.Tier === 0) {
			return;
		}

		if (logical.Tier <= 0) {
			freeCountries[logical.ExitCountry] = true;
		}

		attachLogicalIntoCountryList(userTier, logical, countries);
	});
};
