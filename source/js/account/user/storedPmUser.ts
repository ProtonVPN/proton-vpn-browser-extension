import type {Timed} from '../../tools/storage';
import {sessionDataStorageType, storage} from '../../tools/storage';
import type {PmUser} from './PmUser';
import type {WrappedUser} from './UserWrapper';

export const storedPmUser = storage.item<
	Partial<Timed<{user: WrappedUser<PmUser>}>>
>('pmUser', sessionDataStorageType);
