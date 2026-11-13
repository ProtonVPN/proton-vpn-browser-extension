import {sendMessageTo} from './sendMessageTo';

export const sendMessageToBackground = <K>(
	type: string,
	data: unknown = undefined,
) => sendMessageTo<K>(type, data);
