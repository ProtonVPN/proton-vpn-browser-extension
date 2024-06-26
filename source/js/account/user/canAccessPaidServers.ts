import {User} from './User';
import {getUserMaxTier} from './getUserMaxTier';

export const canAccessPaidServers = (user: User|undefined) => getUserMaxTier(user) > 0;
