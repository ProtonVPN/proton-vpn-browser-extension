import {triggerPromise} from '../../tools/triggerPromise';
import {storedUser} from './storedUser';
import {storedPmUser} from './storedPmUser';

export const forgetUser = () =>
	triggerPromise(Promise.all([storedUser.remove(), storedPmUser.remove()]));
