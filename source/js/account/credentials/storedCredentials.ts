import {sessionStorageType, storage, Timed} from '../../tools/storage';
import {Credentials} from './Credentials';

export type CredentialsCacheItem = Partial<Timed<{credentials?: Credentials}>>;

export const storedCredentials = storage.selfItem<CredentialsCacheItem>('credentials', sessionStorageType);
