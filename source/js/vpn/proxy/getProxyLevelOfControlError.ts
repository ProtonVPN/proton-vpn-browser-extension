'use background';
import {c} from '../../tools/translate';
import {checkProxyLevelOfControl} from './checkProxyControlledByOtherExtensions';

export const getProxyControlledByOtherError = (currentlyConnected = false) =>
	new Error(
		currentlyConnected
			? c('Error')
					.t`Disconnection detected: another extension took control over the proxy parameters. Proton VPN will reconnect automatically once the other VPN or proxy extension is disabled.`
			: c('Error')
					.t`Unable to connect as another extension controls the proxy parameters, disable other VPN or proxy extensions and retry`,
	);

export const getProxyNotControllableError = (currentlyConnected = false) =>
	new Error(
		currentlyConnected
			? c('Error')
					.t`Disconnection detected: proxy parameters have been locked by your browser configuration or your organization`
			: c('Error')
					.t`Unable to connect as the proxy parameters are locked by your browser configuration or your organization`,
	);

/**
 * Error to show when connection failed or broke because of who controls
 * the proxy settings, undefined if the level of control does not explain
 * the failure.
 */
export const getProxyLevelOfControlError = (
	levelOfControl: chrome.types.LevelOfControl | undefined,
	currentlyConnected = false,
): Error | undefined => {
	switch (levelOfControl) {
		case 'controlled_by_other_extensions':
			return getProxyControlledByOtherError(currentlyConnected);

		case 'not_controllable':
			return getProxyNotControllableError(currentlyConnected);

		default:
			return undefined;
	}
};

export const getProxyNotConnectableError = async () =>
	getProxyLevelOfControlError(await checkProxyLevelOfControl()) ??
	new Error(
		c('Error')
			.t`Not able to control the browser network settings, possibly a permission is missing`,
	);
