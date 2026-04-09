import {getGlobalBrowser} from './getGlobalBrowser';

export const getTabs = () => {
	const tabs = getGlobalBrowser().tabs;

	if (!tabs) {
		throw new Error(
			'Some permissions for the extension are missing, please try to re-install',
		);
	}

	return tabs;
};
