'use popup';
import {configureCallback} from './configureCallback';

export const configureCallbackOnce = <T>(name: string, initialValue?: T) =>
	configureCallback(name, initialValue, true);
