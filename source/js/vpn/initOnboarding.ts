import {isOauthAllowed} from '../account/partner/oauth';
import {getTabs} from '../tools/getTabs';
import {getRuntime} from '../tools/getRuntime';

export const initOnboarding = () => {
	const runtime = getRuntime();

	runtime?.onInstalled.addListener(async (details) => {
		if (await isOauthAllowed()) {
			return;
		}

		switch (details.reason) {
			case 'install':
				// /^moz-extension:/.test(url)
				// 	? runtime.getURL('/onboarding-firefox.html')
				// 	: url
				await getTabs().create({
					url: runtime.getURL('/onboarding.html'),
				});
		}
	});
};
