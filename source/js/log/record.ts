import {sendMessageToBackground} from '../tools/sendMessageToBackground';
import {BackgroundAction} from '../messaging/MessageType';
import {isInBackground} from '../context/isInBackground';
import {triggerPromise} from '../tools/triggerPromise';
import {CacheWrappedValue, storage} from '../tools/storage';

const records: any[][] = [];
let recordReady = false;

const storedRecords = storage.item<CacheWrappedValue<any[][]>>('logs');
storedRecords.get().then(previousRecords => {
	if (previousRecords?.value) {
		records.push(...previousRecords.value);
		storedRecords.setValue(records);
		recordReady = true;
	}
});

(global as any).getLogs = () => records.slice();

export const record = (...params: any[]) => {
	if (isInBackground()) {
		records.unshift([Date.now(), ...params]);
		records.splice(100, 1000);

		if (recordReady) {
			storedRecords.setValue(records);
		}

		return;
	}

	triggerPromise(sendMessageToBackground(BackgroundAction.LOG, [...params]));
};
