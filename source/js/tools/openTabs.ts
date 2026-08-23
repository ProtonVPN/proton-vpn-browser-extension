import {triggerPromise} from './triggerPromise';
import {Storage, storage} from './storage';
import type {ForkResponse} from '../messaging/ForkResponse';
import {getPartnerById} from '../account/partner/partners';
import {executeOnTab} from './executeOnTab';
import {getTabs} from './getTabs';
import {baseDomainURL} from '../config';

const tabData = storage.item<Record<number, true>>('tabs', Storage.LOCAL);

export const addTab = (id: number): void => {
	triggerPromise(
		(async () =>
			await tabData.set({
				...(await tabData.load({})),
				[id]: true,
			} as Record<number, true>))(),
	);
};

export const connectTab = (id: number): void => {
	addTab(id);
	triggerPromise(
		getTabs().executeScript?.(id, {
			code: `
				chrome.runtime.connect();
				window.addEventListener('message', (event) => {
					if (event.source != window) {
						return;
					}

					const [protocol, domain] = \`\${event.origin}://\`.split('://');

					if (protocol !== 'https' || !domain) {
						return;
					}

					const mainDomain = domain.replace(/^[^/]+\\.([^./]+\\.[^./]+)$/, '$1');
					const baseDomain = ${JSON.stringify(baseDomainURL)}
						.replace(/^[^/]+:\\/\\//, '')
						.replace(/^[^/]+:\\/\\/([^/]+)\\/.*$/, '$1')
						.replace(/^[^/]+\\.([^./]+\\.[^./]+)$/, '$1');

					if (mainDomain === 'proton.me' || mainDomain === baseDomain) {
						chrome.runtime.sendMessage({...event.data, tabId: ${JSON.stringify(id)}});
					}
				}, false);
			`,
		}),
	);
};

export const sendForkResponse = async (
	tabId: number | undefined,
	response: ForkResponse | undefined,
): Promise<void> => {
	if (!response) {
		return;
	}

	const partnerConfig = response.partnerId
		? getPartnerById(response.partnerId)
		: undefined;

	await Promise.all(
		(tabId ? [tabId] : Object.keys(await tabData.load({}))).map(
			async (tabId: string | number) => {
				tabId = Number(tabId);
				const welcomePage = partnerConfig?.welcomePage;

				await executeOnTab(
					tabId,
					() => ({
						func: (response: ForkResponse, welcomePage: string | undefined) => {
							if (welcomePage) {
								location.href = welcomePage;
							}

							window.postMessage(response);
						},
						args: [response, welcomePage] as [ForkResponse, string | undefined],
					}),
					() => `
						${welcomePage ? `location.href = ${JSON.stringify(welcomePage)};` : ''}
						window.postMessage(${JSON.stringify(response)});
					`,
				);
			},
		),
	);
	triggerPromise(tabData.set({}));
};
