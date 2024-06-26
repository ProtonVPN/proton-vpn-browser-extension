import {Credentials} from './Credentials';
import {CredentialsData} from './CredentialsData';

const parseCredentialUsername = (username: any): any => {
	if (typeof username !== 'string') {
		return {};
	}

	try {
		const body = JSON.parse(atob(username.split('.')[1] || '') || '{}');

		return typeof body === 'object' && !(body instanceof Array) ? body : {};
	} catch (e) {
		return {};
	}
};

export const getCredentialsData = (credentials?: Partial<Credentials>): CredentialsData => {
	const data = parseCredentialUsername(credentials?.Username);

	return {
		expiration: data.exp || 0,
		groups: (data.grp || '').split(',').filter(Boolean),
		sessionId: data.sid || null,
	};
};
