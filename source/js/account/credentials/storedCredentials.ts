import {sessionDataStorageType, storage} from '../../tools/storage';
import type {Credentials} from './Credentials';

export type CredentialsCacheItem = Partial<{
	/**
	 * @deprecated use the explicit getCachedCredentialsExpirationTime function instead
	 *
	 * Despite other "time" properties attached to stored items, this one represent the
	 * milliseconds-timestamp of the expiration, not the creation, hence why to avoid
	 * accessing it directly.
	 */
	time: number;
	credentials?: Credentials;
}>;

export const storedCredentials = storage.selfItem<CredentialsCacheItem>(
	'credentials',
	sessionDataStorageType,
);
