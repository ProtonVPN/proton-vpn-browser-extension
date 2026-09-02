import {getCountryAndCoordinates} from '../getLocation';
import type {UserContext} from './UserContext';

export const getUserContext = async (tier: number): Promise<UserContext> => {
	const {country, coordinates} = await getCountryAndCoordinates();

	return {tier, country, location: coordinates};
};
