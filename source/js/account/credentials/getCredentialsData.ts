'use background';
import type {Credentials} from './Credentials';
import type {CredentialsData} from './CredentialsData';

interface CredentialUsernameBody {
	exp?: number;
	grp?: string;
	sid?: string;
}

const parseCredentialUsername = (username: unknown): CredentialUsernameBody => {
	if (typeof username !== 'string') {
		return {};
	}

	try {
		const body = JSON.parse(atob(username.split('.')[1] || '') || '{}');

		return typeof body === 'object' && !(body instanceof Array) ? body : {};
	} catch {
		return {};
	}
};

export const getCredentialsData = (
	credentials?: Partial<Credentials>,
): CredentialsData => {
	const data = parseCredentialUsername(credentials?.Username);

	return {
		expiration: data.exp || 0,
		groups: (data.grp || '').split(',').filter(Boolean),
		sessionId: data.sid || null,
	};
};
