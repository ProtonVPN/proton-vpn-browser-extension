import {timeoutAfter} from '../../tools/delay';
import {getInfoFromBackground} from '../../tools/getInfoFromBackground';
import {BackgroundData} from '../../messaging/MessageType';
import {milliSeconds} from '../../tools/milliSeconds';
import {InitUserError} from '../../account/InitUserError';

export const getPmUserFromBackground = async (maxMilliSeconds?: number) =>
	await timeoutAfter(
		getInfoFromBackground(BackgroundData.PM_USER),
		maxMilliSeconds ?? milliSeconds.fromSeconds(30),
		'User loading timed out',
		InitUserError,
	);
