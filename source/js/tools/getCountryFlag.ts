import {getCountryCode} from './getCountryCode';

export const getCountryFlag = (country: string, vocalized = false) => {
	country = getCountryCode(country);

	return `<img
		loading="lazy"
		class="country-flag-img"
		src="/img/flags/${country.toLowerCase()}.svg"
		alt="${String.fromCodePoint(...[...country].map(c => c.charCodeAt(0) + 0x1F1A5))}"
		width="20"
		height="15"
		${vocalized ? 'aria-hidden="true"' : ''}
	/>`;
};
