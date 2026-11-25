import {getTabs} from '../tools/getTabs';
import {getRuntime} from '../tools/getRuntime';
import {warn} from '../log/log';

export const initOnboarding = async () => {
	const tabs = getTabs();
	const url = getRuntime().getURL('/onboarding.html');

	try {
		const existingTabIds = (await tabs.query({url}))
			.map((tab) => tab.id)
			.filter((id): id is number => typeof id === 'number');

		await Promise.all(
			existingTabIds.map((id) =>
				tabs.remove(id).catch(() => {
					// Tab closed in the meantime, nothing to do
				}),
			),
		);
	} catch (error) {
		warn(error);
	}

	await tabs.create({url});
};
