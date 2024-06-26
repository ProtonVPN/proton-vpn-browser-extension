import {Credentials} from './Credentials';
import {getCredentialsData} from './getCredentialsData';

export const mayReplaceCredentials = (
	oldCredentials?: Partial<Credentials>,
	newCredentials?: Partial<Credentials>,
): boolean => {
	if (!oldCredentials || !newCredentials) {
		return true;
	}

	const oldCredentialsData = getCredentialsData(oldCredentials);
	const newCredentialsData = getCredentialsData(newCredentials);

	if (oldCredentialsData.sessionId !== newCredentialsData.sessionId) {
		return true;
	}

	return newCredentialsData.expiration > oldCredentialsData.expiration;
};
