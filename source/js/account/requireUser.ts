import {timeoutAfter} from '../tools/delay';
import {getInfoFromBackground} from '../tools/getInfoFromBackground';
import {BackgroundData} from '../messaging/MessageType';
import {milliSeconds} from '../tools/milliSeconds';
import {InitUserError} from './InitUserError';
import {c} from '../tools/translate';

export const requireUser = async () => {
	const user = await timeoutAfter(
		getInfoFromBackground(BackgroundData.USER),
		milliSeconds.fromSeconds(30),
		'User info loading timed out',
		InitUserError,
	);

	if (!user) {
		throw new InitUserError(c('Error').t`Unable to login`);
	}

	return user;
};
