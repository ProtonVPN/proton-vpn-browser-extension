import {sessionStorageType, storage, Timed} from '../../tools/storage';
import {PmUser, PmUserResult} from './PmUser';

export const storedPmUser = storage.item<Partial<Timed<{user: PmUser | PmUserResult}>>>('pmUser', sessionStorageType);
