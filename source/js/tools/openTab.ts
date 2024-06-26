import {delay} from './delay';
import {triggerPromise} from './triggerPromise';
import _CreateCreateProperties = browser.tabs._CreateCreateProperties;

const opening: Record<string, true> = {};

export const openTab = async (urlOrOptions: string | _CreateCreateProperties, id?: string | undefined) => {
	const options = typeof urlOrOptions === 'string' ? {url: urlOrOptions} : urlOrOptions;
	const requestId = id || options.url;

	if (requestId) {
		if (opening[requestId]) {
			throw new Error('Url already open');
		}

		opening[requestId] = true;

		setTimeout(() => {
			delete opening[requestId];
		}, 800);
	}

	return await browser.tabs.create(options);
};

export const leaveWindowForTab = (window: Window, urlOrOptions: string | _CreateCreateProperties, id?: string | undefined): void => {
	triggerPromise(openTab(urlOrOptions, id));
	delay(1).then(() => {
		window.close();
	});
};
