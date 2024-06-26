import {sendMessageTo} from './sendMessageTo';

export const sendMessageToBackground = <K>(type: string, data: any = undefined) => sendMessageTo<K>(type, data);
