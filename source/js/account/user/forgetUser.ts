import {triggerPromise} from '../../tools/triggerPromise';
import {storedUser} from './storedUser';

export const forgetUser = () => triggerPromise(storedUser.remove());
