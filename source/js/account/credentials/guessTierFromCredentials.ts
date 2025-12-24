import {Credentials} from './Credentials';
import {getCredentialsData} from './getCredentialsData';

export const guessTierFromCredentials = (credentials: Credentials): number => {
	if (getCredentialsData(credentials).groups.includes('vpn-paid')) {
		return 2;
	}

	return 0;
};
