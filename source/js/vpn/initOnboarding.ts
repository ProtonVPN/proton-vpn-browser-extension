import {isOauthAllowed} from '../account/partner/oauth';
import {getTabs} from '../tools/getTabs';

export const initOnboarding = () => {
	browser.runtime.onInstalled.addListener(async (details) => {
		if (await isOauthAllowed()) {
			return;
		}

		switch (details.reason) {
			case 'install':
				const url = browser.runtime.getURL('/onboarding.html');
				// /^moz-extension:/.test(url)
				// 	? browser.runtime.getURL('/onboarding-firefox.html')
				// 	: url

				await getTabs().create({
					url,
				});
		}
	});
};
