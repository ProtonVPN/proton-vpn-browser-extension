import {triggerPromise} from '../../../tools/triggerPromise';
import {clientConfigStore} from './storedClientConfig';

export const forgetClientConfig = () => triggerPromise(clientConfigStore.remove());
