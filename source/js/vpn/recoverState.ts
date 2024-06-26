import {ProxyServer} from './ConnectionState';
import {setButton} from '../tools/browserAction';
import {cancelNextCredentialFetch} from '../account/credentials/getConnectionCredentials';
import {getUser} from '../account/user/getUser';
import {checkAutoConnect, connect, logIn} from '../state';

export const recoverState = async (server: ProxyServer | undefined) => {
	setButton('loggedOut');
	cancelNextCredentialFetch();

	// If no user
	if (!await getUser(true)) {
		// Stay logged out
		return;
	}

	if (server) {
		await connect({server});

		return;
	}

	// Switch to logged in state
	logIn();
	// Connect if auto-connect setting is on
	await checkAutoConnect();
};
