import type {Timed} from '../../tools/storage';
import {sessionDataStorageType, storage} from '../../tools/storage';
import type {PmUser, PmUserResult} from './PmUser';

export const storedPmUser = storage.item<
	Partial<Timed<{user: PmUser | PmUserResult}>>
>('pmUser', sessionDataStorageType);
