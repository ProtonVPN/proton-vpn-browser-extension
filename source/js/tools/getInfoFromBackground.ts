import {sendMessageToBackground} from './sendMessageToBackground';
import {User} from '../account/user/User';
import {ConnectionState} from '../vpn/ConnectionState';
import {PmUser} from '../account/user/PmUser';

interface BackgroundObjects {
	location: Location;
	user: User;
	pmUser: PmUser;
	state: ConnectionState['data'];
}

export const getInfoFromBackground = <K extends keyof BackgroundObjects>
	(key: K): Promise<BackgroundObjects[K]> => sendMessageToBackground<BackgroundObjects[K]>(key);
