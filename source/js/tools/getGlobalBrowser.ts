export const getGlobalBrowser = (): typeof global.browser => {
	if (!global.browser) {
		(global as {browser: typeof browser}).browser =
			chrome as unknown as typeof browser;
	}

	return global.browser;
};
