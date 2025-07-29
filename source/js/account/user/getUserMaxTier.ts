import type {User} from './User';

export const getUserMaxTier = (user: User|undefined) => user?.VPN?.MaxTier || 0;
