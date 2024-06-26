export const getCountryFlag = (country: string, vocalized = false) => {
	country = country.toUpperCase();
	country = {UK: 'GB'}[country] || country;

	return `<img
		class="country-flag-img"
		src="/img/flags/${country.toLowerCase()}.svg"
		alt="${String.fromCodePoint(...[...country].map(c => c.charCodeAt(0) + 0x1F1A5))}"
		width="20"
		height="15"
		${vocalized ? 'aria-hidden="true"' : ''}
	/>`;
};
