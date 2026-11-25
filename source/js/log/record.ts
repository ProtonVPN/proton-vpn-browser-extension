import {sendMessageToBackground} from '../tools/sendMessageToBackground';
import {BackgroundAction} from '../messaging/MessageType';
import {isInBackground} from '../context/isInBackground';
import {triggerPromise} from '../tools/triggerPromise';
import type {CacheWrappedValue} from '../tools/storage';
import {storage} from '../tools/storage';
import {serializeError} from '../messaging/errorSerialization';

const records: unknown[][] = [];
let recordReady = false;

const storedRecords = storage.item<CacheWrappedValue<unknown[][]>>('logs');
storedRecords.get().then((previousRecords) => {
	// Dev-only for now, record in local storage only if an initial record
	// has been added manually
	if (previousRecords?.value) {
		records.push(...previousRecords.value);
		triggerPromise(storedRecords.setValue(records));
		recordReady = true;
	}
});

(global as {getLogs?: () => unknown[]}).getLogs = () => records.slice();

export const record = (...rawParams: unknown[]) => {
	const params = rawParams.map(serializeError);

	if (isInBackground()) {
		records.unshift([Date.now(), ...params]);
		records.splice(100, 1000);

		if (recordReady) {
			triggerPromise(storedRecords.setValue(records));
		}

		return;
	}

	triggerPromise(sendMessageToBackground(BackgroundAction.LOG, params));
};
