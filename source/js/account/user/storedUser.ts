import {sessionDataStorageType, storage, Timed} from '../../tools/storage';
import {User, UserResult} from './User';

export const storedUser = storage.selfItem<Partial<Timed<{user?: User | UserResult}>>>('user', sessionDataStorageType);
