export const getCountryCode = (country: string|null) => {
	country = `${country || 'US'}`.toUpperCase();

	return {UK: 'GB'}[country] || country;
}
