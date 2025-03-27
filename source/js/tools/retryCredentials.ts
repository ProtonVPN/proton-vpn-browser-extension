import {getCredentials} from '../account/credentials/getConnectionCredentials';
import {c} from '../tools/translate';
import {disconnect, getCurrentState} from '../state';
import {ApiError} from '../api';
import {milliSeconds} from '../tools/milliSeconds';

let checkingCredentials = false;
let lastRetry = 0;
let lastTimeout: NodeJS.Timeout | undefined = undefined;

export const retryCredentials = (disconnectOnFailure = false) => {
	if (lastTimeout) {
		return;
	}

	lastTimeout = setTimeout(async () => {
		clearTimeout(lastTimeout);
		lastTimeout = undefined;
		lastRetry = Date.now();

		if (checkingCredentials) {
			return;
		}

		checkingCredentials = true;

		try {
			const credentials = await getCredentials();

			if (!credentials) {
				throw new Error(
					c('Error').t`Unable to reach the server, please try to reconnect, or to log out and log in again if the problem persists`,
				);
			}

			await getCurrentState()?.connectCurrentServer?.();
		} catch (e) {
			if (disconnectOnFailure) {
				disconnect(e as Error | ApiError);
			}
		} finally {
			checkingCredentials = false;
		}
	}, Math.max(1, lastRetry + milliSeconds.fromSeconds(20) - Date.now()));
};
