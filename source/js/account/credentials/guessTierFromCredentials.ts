import {Credentials} from './Credentials';
import {getCredentialsData} from './getCredentialsData';

export const guessTierFromCredentials = (credentials: Credentials): number => {
	if (getCredentialsData(credentials).groups.indexOf('vpn-paid') !== -1) {
		return 2;
	}

	return 0;
};
