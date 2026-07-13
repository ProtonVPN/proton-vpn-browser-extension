import {isOauthAllowed} from '../account/partner/oauth';
import {getRuntime} from '../tools/getRuntime';
import {initOnboarding} from './initOnboarding';

export const initPostInstallationHook = () => {
	const runtime = getRuntime();

	runtime?.onInstalled.addListener(async (details) => {
		if (await isOauthAllowed()) {
			return;
		}

		switch (details.reason) {
			case 'install':
				await initOnboarding();
		}
	});
};
