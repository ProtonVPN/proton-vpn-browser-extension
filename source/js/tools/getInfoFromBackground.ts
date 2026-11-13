import {sendMessageToBackground} from './sendMessageToBackground';
import type {User} from '../account/user/User';
import type {ConnectionState} from '../vpn/ConnectionState';
import type {PmUser} from '../account/user/PmUser';

interface BackgroundObjects {
	location: Location;
	user: User | undefined;
	pmUser: PmUser | undefined;
	state: ConnectionState['data'];
}

export const getInfoFromBackground = <K extends keyof BackgroundObjects>(
	key: K,
): Promise<BackgroundObjects[K]> =>
	sendMessageToBackground<BackgroundObjects[K]>(key);
