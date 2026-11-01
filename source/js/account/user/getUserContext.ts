import {getCountryAndCoordinates} from '../getLocation';

export const getUserContext = async (tier: number) => {
	const {country, coordinates} = await getCountryAndCoordinates();

	return {
		country,
		location: coordinates,
		tier,
	};
};
