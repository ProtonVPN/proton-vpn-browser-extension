'use background';
import {current, defineState} from './stateStore';
import {cancelNextCredentialFetch} from '../../account/credentials/getConnectionCredentials';
import {setButton} from '../../tools/browserAction';
import {clearProxy} from '../../tools/proxy';
import {milliSeconds} from '../../tools/milliSeconds';
import {notifyStateChange} from '../../tools/notifyStateChange';

// **** Logged out state ****
export const loggedOutState = defineState({
	name: 'loggedout',
	initializedAt: 0,
	async init(): Promise<void> {
		cancelNextCredentialFetch();
		//Always start clean
		current().data = {};

		setButton('loggedOut');

		notifyStateChange('logged-out');

		await clearProxy();
	},
	checkConnectingState(time: number): void {
		if (Date.now() - time > milliSeconds.fromSeconds(5)) {
			notifyStateChange('logged-out');
		}
	},
});
