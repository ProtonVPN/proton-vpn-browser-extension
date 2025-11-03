import {getTabs} from './getTabs';

export const getCurrentTab = () => getTabs().query({
	active: true,
	currentWindow: true,
}).then(tabs => tabs[0]);
