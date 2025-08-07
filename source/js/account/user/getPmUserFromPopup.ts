import {timeoutAfter} from '../../tools/delay';
import {getInfoFromBackground} from '../../tools/getInfoFromBackground';
import {BackgroundData} from '../../messaging/MessageType';
import {milliSeconds} from '../../tools/milliSeconds';
import {InitUserError} from '../../account/InitUserError';

export const getPmUserFromPopup = async () =>  await timeoutAfter(
	getInfoFromBackground(BackgroundData.PM_USER),
	milliSeconds.fromSeconds(30),
	'User loading timed out',
	InitUserError,
);
