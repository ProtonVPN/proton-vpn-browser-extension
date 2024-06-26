import {triggerPromise} from './triggerPromise';
import {Storage, storage} from './storage';
import {warn} from '../log/log';
import {ForkResponse} from '../messaging/ForkResponse';

const root = global || window;
root.browser || ((root as any).browser = chrome);

const tabData = storage.item<Record<number, true>>('tabs', Storage.LOCAL);

export const addTab = (id: number): void => {
	triggerPromise((async () => (await tabData.set({
		...(await tabData.load({})),
		[id]: true,
	} as Record<number, true>)))());
};

export const connectTab = (id: number): void => {
	addTab(id);
	triggerPromise(browser.tabs.executeScript?.(id, {
		code: `
			chrome.runtime.connect();
			window.addEventListener('message', (event) => {
				if (event.source != window) {
					return;
				}

				chrome.runtime.sendMessage({...event.data, tabId: ${JSON.stringify(id)}});
			}, false);
		`,
	}));
}

export const sendForkResponse = async (
	tabId: number | undefined,
	response: ForkResponse | undefined,
): Promise<void> => {
	if (!response) {
		return;
	}

	await Promise.all(
		(tabId ? [tabId] : Object.keys((await tabData.load({})))).map(async (tabId: string | number) => {
			tabId = Number(tabId);

			try {
				await ((browser as any as typeof chrome).scripting?.executeScript?.(
					{
						target: {tabId, allFrames: true},
						func(response) {
							window.postMessage(response);
						},
						args: [response],
					},
				) || browser.tabs.executeScript?.(tabId, {
					code: `
						window.postMessage(${JSON.stringify(response)});
					`,
				}));
			} catch (e) {
				warn(e);
			}
		}),
	);
	triggerPromise(tabData.set({}));
};
