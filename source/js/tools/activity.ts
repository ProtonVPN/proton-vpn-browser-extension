import {Storage, storage} from './storage';
import {triggerPromise} from './triggerPromise';

const lastActivity = storage.item<{time: number}>('last-activity', Storage.SESSION, 'time');

export const getLastActivityTime = async () => {
	const time = (await lastActivity.getDefined({time: 0})).time;

	if (time) {
		return time;
	}

	const now = Date.now();
	triggerPromise(lastActivity.setValue(now));

	return now;
};

export const getElapsedMillisecondsSinceLastActivity = async () => Date.now()
	- await getLastActivityTime();

export const updateLastActivityTime = () => lastActivity.setValue(Date.now());
