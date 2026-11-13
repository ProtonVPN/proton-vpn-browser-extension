import type {Timed} from '../../tools/storage';
import {sessionDataStorageType, storage} from '../../tools/storage';
import type {User} from './User';
import type {WrappedUser} from './UserWrapper';

export const storedUser = storage.selfItem<
	Partial<Timed<{user?: WrappedUser<User>}>>
>('user', sessionDataStorageType);
