import {triggerPromise} from '../../tools/triggerPromise';
import {storedCredentials} from './storedCredentials';

export const removeCredentials = () => storedCredentials.remove();

export const forgetCredentials = () => triggerPromise(removeCredentials());
