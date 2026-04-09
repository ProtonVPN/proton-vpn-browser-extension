import {sendMessageToBackground} from './sendMessageToBackground';
import type {User} from '../account/user/User';
import type {ConnectionState} from '../vpn/ConnectionState';
import type {PmUser} from '../account/user/PmUser';
import type {
	BackgroundData,
	BackgroundExtraData,
} from '../messaging/MessageType';

interface BackgroundObjects {
	location: Location;
	user: User;
	pmUser: PmUser;
	state: ConnectionState['data'];
}

export const getInfoFromBackground = <
	K extends keyof BackgroundObjects,
	T extends BackgroundData,
>(
	key: K,
	data:
		| (T extends keyof BackgroundExtraData ? BackgroundExtraData[T] : undefined)
		| undefined = undefined,
): Promise<BackgroundObjects[K]> =>
	sendMessageToBackground<BackgroundObjects[K]>(key, data);
