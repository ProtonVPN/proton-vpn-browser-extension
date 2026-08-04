import {getTabs} from '../tools/getTabs';
import {getRuntime} from '../tools/getRuntime';
import type {CacheWrappedValue} from '../tools/storage';
import {storage} from '../tools/storage';
import Tab = browser.tabs.Tab;
type TabId = Required<Tab>['id'];

const onboardingTabIds =
	storage.item<CacheWrappedValue<TabId[]>>('onboarding-tab-ids');

export const initOnboarding = async () => {
	const tabs = getTabs();

	const idsToRemove = (await onboardingTabIds.get())?.value ?? [];

	if (idsToRemove.length) {
		await tabs.remove(idsToRemove);
		await onboardingTabIds.remove();
	}

	const tabId = (
		await tabs.create({
			url: getRuntime().getURL('/onboarding.html'),
		})
	).id;

	if (typeof tabId !== 'undefined') {
		await onboardingTabIds.transactionValue((ids) => [...(ids ?? []), tabId]);
	}
};
