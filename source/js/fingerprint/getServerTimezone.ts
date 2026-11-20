import type {Coordinates} from '../tools/Coordinates';
import {computeDistance} from '../tools/computeDistance';
import {getCountryCode} from '../tools/getCountryCode';
import {timezoneCountries} from '../tools/timezoneCountries';

type Reference = [timezone: string, latitude: number, longitude: number];

/**
 * Countries spanning several timezones: reference locations (at least one
 * per zone, more for large zones), the zone of the closest one to the
 * server exit location is picked when the city is not in cityTimezones.
 * It's an approximation: borders between zones don't follow distances.
 */
const multiTimezoneCountries: Record<string, Reference[]> = {
	US: [
		['America/New_York', 40.71, -74.01],
		['America/New_York', 33.75, -84.39],
		['America/New_York', 25.76, -80.19],
		['America/Chicago', 41.88, -87.63],
		['America/Chicago', 32.78, -96.8],
		['America/Chicago', 44.98, -93.27],
		['America/Denver', 39.74, -104.99],
		['America/Denver', 40.76, -111.89],
		['America/Denver', 43.62, -116.2],
		['America/Phoenix', 33.45, -112.07],
		['America/Los_Angeles', 34.05, -118.24],
		['America/Los_Angeles', 37.77, -122.42],
		['America/Los_Angeles', 47.61, -122.33],
		['America/Anchorage', 61.22, -149.9],
		['Pacific/Honolulu', 21.31, -157.86],
	],
	CA: [
		['America/St_Johns', 47.56, -52.71],
		['America/Halifax', 44.65, -63.57],
		['America/Toronto', 43.65, -79.38],
		['America/Winnipeg', 49.9, -97.14],
		['America/Regina', 50.45, -104.6],
		['America/Edmonton', 53.55, -113.49],
		['America/Vancouver', 49.28, -123.12],
	],
	AU: [
		['Australia/Sydney', -33.87, 151.21],
		['Australia/Melbourne', -37.81, 144.96],
		['Australia/Brisbane', -27.47, 153.03],
		['Australia/Adelaide', -34.93, 138.6],
		['Australia/Darwin', -12.46, 130.84],
		['Australia/Perth', -31.95, 115.86],
		['Australia/Hobart', -42.88, 147.33],
	],
	BR: [
		['America/Sao_Paulo', -23.55, -46.63],
		['America/Fortaleza', -3.73, -38.52],
		['America/Manaus', -3.12, -60.02],
		['America/Cuiaba', -15.6, -56.1],
		['America/Rio_Branco', -9.97, -67.81],
	],
	MX: [
		['America/Mexico_City', 19.43, -99.13],
		['America/Monterrey', 25.67, -100.31],
		['America/Cancun', 21.16, -86.85],
		['America/Chihuahua', 28.63, -106.07],
		['America/Hermosillo', 29.07, -110.96],
		['America/Tijuana', 32.51, -117.04],
	],
	RU: [
		['Europe/Kaliningrad', 54.71, 20.51],
		['Europe/Moscow', 55.76, 37.62],
		['Europe/Samara', 53.2, 50.15],
		['Asia/Yekaterinburg', 56.84, 60.6],
		['Asia/Omsk', 54.99, 73.37],
		['Asia/Novosibirsk', 55.03, 82.92],
		['Asia/Krasnoyarsk', 56.01, 92.85],
		['Asia/Irkutsk', 52.29, 104.3],
		['Asia/Yakutsk', 62.03, 129.73],
		['Asia/Vladivostok', 43.12, 131.89],
		['Asia/Magadan', 59.56, 150.8],
		['Asia/Kamchatka', 53.02, 158.65],
	],
	ID: [
		['Asia/Jakarta', -6.2, 106.85],
		['Asia/Pontianak', -0.03, 109.33],
		['Asia/Makassar', -5.15, 119.43],
		['Asia/Jayapura', -2.53, 140.72],
	],
	KZ: [
		['Asia/Almaty', 43.24, 76.89],
		['Asia/Aqtobe', 50.28, 57.17],
		['Asia/Aqtau', 43.65, 51.17],
	],
	ES: [
		['Europe/Madrid', 40.42, -3.7],
		['Atlantic/Canary', 28.12, -15.43],
	],
	PT: [
		['Europe/Lisbon', 38.72, -9.14],
		['Atlantic/Azores', 37.74, -25.67],
	],
};

function normalizeCity(city: string): string {
	return city
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z]+/g, ' ')
		.trim();
}

/**
 * Explicit timezone for known server cities in multi-timezone countries,
 * keyed by `${country}:${normalized English city name}`.
 */
const cityTimezones: Record<string, string> = Object.fromEntries(
	(
		[
			[
				'US',
				'America/New_York',
				'New York, Ashburn, Atlanta, Baltimore, Boston, Charlotte, Cleveland, Columbus, Detroit, Indianapolis, Jacksonville, Miami, Newark, Orlando, Philadelphia, Pittsburgh, Raleigh, Richmond, Secaucus, Tampa, Washington',
			],
			[
				'US',
				'America/Chicago',
				'Chicago, Austin, Dallas, Houston, Kansas City, Memphis, Milwaukee, Minneapolis, Nashville, New Orleans, Oklahoma City, Omaha, San Antonio, St Louis, Saint Louis',
			],
			[
				'US',
				'America/Denver',
				'Denver, Albuquerque, Boise, El Paso, Salt Lake City',
			],
			['US', 'America/Phoenix', 'Phoenix, Tucson'],
			[
				'US',
				'America/Los_Angeles',
				'Los Angeles, Las Vegas, Portland, Sacramento, San Diego, San Francisco, San Jose, Seattle',
			],
			['US', 'America/Anchorage', 'Anchorage'],
			['US', 'Pacific/Honolulu', 'Honolulu'],
			['CA', 'America/Toronto', 'Toronto, Montreal, Ottawa, Quebec'],
			['CA', 'America/Vancouver', 'Vancouver'],
			['CA', 'America/Edmonton', 'Calgary, Edmonton'],
			['CA', 'America/Winnipeg', 'Winnipeg'],
			['CA', 'America/Halifax', 'Halifax'],
			['AU', 'Australia/Sydney', 'Sydney'],
			['AU', 'Australia/Melbourne', 'Melbourne'],
			['AU', 'Australia/Brisbane', 'Brisbane'],
			['AU', 'Australia/Adelaide', 'Adelaide'],
			['AU', 'Australia/Perth', 'Perth'],
			['BR', 'America/Sao_Paulo', 'Sao Paulo, Rio de Janeiro'],
			['MX', 'America/Mexico_City', 'Mexico City, Queretaro, Guadalajara'],
			['RU', 'Europe/Moscow', 'Moscow, Saint Petersburg, St Petersburg'],
			['ES', 'Europe/Madrid', 'Madrid, Barcelona, Valencia'],
		] as const
	).flatMap(([country, timezone, cities]) =>
		cities
			.split(',')
			.map((city) => [`${country}:${normalizeCity(city)}`, timezone]),
	),
);

/**
 * Main timezone for countries where the first entry in timezoneCountries
 * is not the most representative one.
 */
const primaryTimezones: Record<string, string> = {
	AR: 'America/Argentina/Buenos_Aires',
	CL: 'America/Santiago',
	CN: 'Asia/Shanghai',
	CY: 'Asia/Nicosia',
	DE: 'Europe/Berlin',
	EC: 'America/Guayaquil',
	MN: 'Asia/Ulaanbaatar',
	MY: 'Asia/Kuala_Lumpur',
	NZ: 'Pacific/Auckland',
	UA: 'Europe/Kiev',
	UZ: 'Asia/Tashkent',
};

const isValidTimezone = (timezone: string): boolean => {
	try {
		new Intl.DateTimeFormat('en-US', {timeZone: timezone});

		return true;
	} catch {
		return false;
	}
};

const getClosestReference = (
	references: Reference[],
	location: Coordinates,
): string | undefined =>
	references
		.map(([timezone, Latitude, Longitude]) => ({
			timezone,
			distance: computeDistance(location, {Latitude, Longitude}),
		}))
		.sort((a, b) => a.distance - b.distance)[0]?.timezone;

const getFirstCountryTimezone = (country: string): string | undefined =>
	Object.keys(timezoneCountries).find(
		(timezone) => timezoneCountries[timezone] === country,
	);

/**
 * Best guess of the IANA timezone of a VPN server, from the most precise
 * to the least precise info: known city, closest reference location in
 * countries having several timezones, then main timezone of the country.
 */
export const getServerTimezone = (server: {
	exitCountry: string;
	exitEnglishCity?: string | null;
	exitLocation?: Coordinates;
}): string | undefined => {
	const country = getCountryCode(server.exitCountry || '');
	const city = normalizeCity(server.exitEnglishCity || '');
	const references = multiTimezoneCountries[country];
	const timezone =
		(city && cityTimezones[`${country}:${city}`]) ||
		(references && server.exitLocation
			? getClosestReference(references, server.exitLocation)
			: undefined) ||
		references?.[0]?.[0] ||
		primaryTimezones[country] ||
		getFirstCountryTimezone(country);

	return timezone && isValidTimezone(timezone) ? timezone : undefined;
};

/**
 * Every timezone getServerTimezone() can return, sorted so the index of a
 * timezone is stable for a given version of the extension.
 */
export const getKnownTimezones = (): string[] =>
	[
		...new Set([
			...Object.keys(timezoneCountries),
			...Object.values(multiTimezoneCountries).flatMap((references) =>
				references.map(([timezone]) => timezone),
			),
			...Object.values(cityTimezones),
			...Object.values(primaryTimezones),
		]),
	].sort();
