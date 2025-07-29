import {requestFork, RequestForkAction} from './fork/requestFork';
import {baseDomainURL} from '../config';
import {getTabs} from '../tools/getTabs';
import {connectTab} from '../tools/openTabs';
import {openTab} from '../tools/openTab';
import {isSuspended, suspend} from '../tools/exponentialBackoff';

export const openForkTab = async ({ action, partnerId, independent }: { action?: RequestForkAction, partnerId?: string, independent?: boolean } = {}) => {
	if (await isSuspended('openForkTab')) {
		throw new Error('Fork in progress');
	}

	suspend('openForkTab', 500);
	openTab(await requestFork({host: baseDomainURL, action, partnerId, independent}), 'fork').then(tab => {
		if (tab.id) {
			connectTab(tab.id);
		}

		const listener = (tabId: number) => {
			if (tab.id === tabId) {
				getTabs().onRemoved.removeListener(listener);
				(browser.action as any)?.openPopup?.();
			}
		};

		getTabs().onRemoved.addListener(listener);
	});
};
