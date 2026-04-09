import {getGlobalBrowser} from './getGlobalBrowser';

export const getRuntime = (): typeof browser.runtime =>
	getGlobalBrowser().runtime;
