import {partners} from '../../account/partner/partners';

interface InputBrowserUserState {
	isLoggedIn: boolean;
	canSignUp?: boolean;
}

interface BrowserUserState {
	partnerId?: string;
	oauthAllowed: boolean;
	loggedInUser: boolean
	signupButton: boolean;
}

const getBrowserUserState = async (key: keyof typeof partners): Promise<BrowserUserState> => new Promise(resolve => {
	const getStatus = (global as any)[key]?.protonvpn?.getStatus;

	if (typeof getStatus === 'function') {
		getStatus((result: InputBrowserUserState | undefined) => {
			if (typeof result?.isLoggedIn !== 'boolean') {
				resolve({
					oauthAllowed: false,
					loggedInUser: false,
					signupButton: false,
				});

				return;
			}

			resolve({
				partnerId: partners[key]?.id,
				oauthAllowed: true,
				loggedInUser: result.isLoggedIn,
				signupButton: result.canSignUp || false,
			});
		});

		return;
	}

	resolve({
		oauthAllowed: false,
		loggedInUser: false,
		signupButton: false,
	});
});

export const getOauthConfig = async () => {
	const partnerKeys = Object.keys(partners) as (keyof typeof partners)[];
	const partnerConfigs = (await Promise.all(partnerKeys.map(getBrowserUserState)))
		.filter(config => config.oauthAllowed);

	return partnerConfigs[0] || {
		oauthAllowed: false,
		loggedInUser: false,
		signupButton: false,
	};
};

export const isOauthAllowed = async () => (await getOauthConfig()).oauthAllowed;
