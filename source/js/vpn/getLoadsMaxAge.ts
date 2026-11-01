import {getLogicalLoadsRefreshInterval} from '../intervals';
import {getElapsedMillisecondsSinceLastActivity} from '../tools/activity';
import {milliSeconds} from '../tools/milliSeconds';

export const getLoadsMaxAge = async () => {
	const baseInterval = getLogicalLoadsRefreshInterval();
	const idleDuration = await getElapsedMillisecondsSinceLastActivity();

	// Still connected or active during the last 3 hours
	if (idleDuration < milliSeconds.fromHours(3)) {
		return baseInterval / 2;
	}

	// Between 3 hours and 1 day
	if (idleDuration < milliSeconds.fromHours(24)) {
		return baseInterval * 2;
	}

	// More than 1 day
	return baseInterval * 4;
};
