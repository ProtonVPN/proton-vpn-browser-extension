import {Feature} from '../vpn/Feature';

export const buttonMatchesSecureCore = (
	button: HTMLElement,
	secureCoreFeatureEnabled: boolean,
	currentlyConnectedToSecureCore: boolean,
) => {
	const excludedFeatures = Number(
		button.getAttribute('data-excludedFeatures') ||
			(button.parentNode as HTMLElement)?.getAttribute(
				'data-excludedFeatures',
			) ||
			0,
	);
	const requiredFeatures = Number(
		button.getAttribute('data-requiredFeatures') ||
			(button.parentNode as HTMLElement)?.getAttribute(
				'data-requiredFeatures',
			) ||
			0,
	);

	if (excludedFeatures & Feature.SECURE_CORE) {
		return !currentlyConnectedToSecureCore;
	}

	if (requiredFeatures & Feature.SECURE_CORE) {
		return currentlyConnectedToSecureCore;
	}

	return secureCoreFeatureEnabled === currentlyConnectedToSecureCore;
};
