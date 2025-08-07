export const getTabs = () => {
	if (!browser.tabs) {
		throw new Error('Some permissions for the extension are missing, please try to re-install');
	}

	return browser.tabs;
};
