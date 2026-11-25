'use background';
import {fetchApi} from '../api/fetchApi';
import {RequestPriority, withPriority} from '../api/RequestPriority';
import {triggerPromise} from '../tools/triggerPromise';
import {persistentlyStoredSession, storedSession} from './readSession';
import {forgetUser} from './user/forgetUser';
import {forgetCredentials} from './credentials/removeCredentials';
import {forgetClientConfig} from './user/clientconfig/forgetClientConfig';
import {forgetLogicals} from '../vpn/getLogicals';
import {forgetLastChoice} from '../vpn/lastChoice';

/**
 * Remove every account-related data stored by the extension
 * (user, session, credentials, servers list, last choice, client config).
 *
 * If deleteSession is true, also revoke the session on the API side.
 */
export const clearAccountData = async (
	deleteSession: boolean,
): Promise<void> => {
	const session = await storedSession.get();

	forgetUser();
	triggerPromise(storedSession.remove());
	triggerPromise(persistentlyStoredSession.remove());
	forgetCredentials();
	forgetLogicals();
	forgetLastChoice();
	forgetClientConfig();

	if (deleteSession && session?.uid) {
		triggerPromise(
			fetchApi(
				'auth',
				withPriority(RequestPriority.NORMAL, {method: 'DELETE'}),
				undefined,
				session,
			),
		);
	}
};
