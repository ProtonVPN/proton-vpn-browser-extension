import {CountryItem} from '../components/countryList';

export const hasSearchScore = (
	group: CountryItem
): boolean => (group.logicals || []).some(logical => logical.SearchScore)
	|| (Object.values(group.groups || {})).some(hasSearchScore);
