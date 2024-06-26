import {requestFork, RequestForkAction} from './fork/requestFork';
import {baseDomainURL} from '../config';
import {connectTab} from '../tools/openTabs';
import {openTab} from '../tools/openTab';
import {isSuspended, suspend} from '../tools/exponentialBackoff';

export const openForkTab = async (action?: RequestForkAction) => {
	if (await isSuspended('openForkTab')) {
		throw new Error('Fork in progress');
	}

	suspend('openForkTab', 500);
	openTab(await requestFork(baseDomainURL, action), 'fork').then(tab => {
		if (tab.id) {
			connectTab(tab.id);
		}

		const listener = (tabId: number) => {
			if (tab.id === tabId) {
				browser.tabs.onRemoved.removeListener(listener);
				(browser.action as any)?.openPopup?.();
			}
		};

		browser.tabs.onRemoved.addListener(listener);
	});
};
