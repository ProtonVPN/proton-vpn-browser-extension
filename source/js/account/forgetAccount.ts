import {forgetUser} from './user/forgetUser';
import {forgetCredentials} from './credentials/removeCredentials';
import {forgetLogicals} from '../vpn/getLogicals';
import {forgetPmUser} from './user/forgetPmUser';
import {triggerPromise} from '../tools/triggerPromise';
import {sendMessageToBackground} from '../tools/sendMessageToBackground';
import {BackgroundAction} from '../messaging/MessageType';

export const forgetAccount = (): void => {
	forgetUser();
	forgetCredentials();
	forgetLogicals();
	forgetPmUser();
	triggerPromise(sendMessageToBackground(BackgroundAction.FORGET_ERROR));

	setTimeout(() => {
		window?.close();
	}, 1);
};
