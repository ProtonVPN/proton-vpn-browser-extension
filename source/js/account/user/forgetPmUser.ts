import {triggerPromise} from '../../tools/triggerPromise';
import {storedPmUser} from './storedPmUser';

export const forgetPmUser = () => triggerPromise(storedPmUser.remove());
