import {disconnect, isCurrentStateConnected} from '../state';
import {isConnected} from '../vpn/connectedServer';
import {c} from '../tools/translate';
import LevelOfControl = browser.types.LevelOfControl;
import OnChangeDetails = browser.types._OnChangeDetails;

const getDisconnectionMessage = (
	levelOfControl: LevelOfControl,
	newProxy: any,
): string => {
	const host = newProxy?.host || '';
	const port = newProxy?.port || '';
	const hasProxyInfo = Boolean(host || port);
	const newProxyName = hasProxyInfo ? `${host}:${port}` : '';

	if (levelOfControl === 'controlled_by_other_extensions') {
		if (hasProxyInfo) {
			return c('Info')
				.t`Disconnected by another extension, it connected to ${newProxyName}`;
		}

		return c('Info').t`Disconnected by another extension`;
	}

	if (hasProxyInfo) {
		return c('Info')
			.t`Disconnected, settings were overridden to ${newProxyName}`;
	}

	return c('Info').t`Disconnected, settings were overridden`;
};

const proxySettingsWatcher = async (event: OnChangeDetails) => {
	const connected = isCurrentStateConnected() || (await isConnected());

	if (!connected) {
		// Don't bother if Proton VPN is not currently connected
		return;
	}

	if (event.levelOfControl === 'controlled_by_this_extension') {
		// Action from the user or auto-reconnection
		return;
	}

	disconnect(
		new Error(
			getDisconnectionMessage(
				event.levelOfControl,
				event.value?.rules?.singleProxy,
			),
		),
	);
};

let proxySettingsWatcherInitialized = true;

export const removeProxySettingsWatcher = () => {
	if (!proxySettingsWatcherInitialized || !browser.proxy) {
		return;
	}

	proxySettingsWatcherInitialized = false;
	browser.proxy.settings.onChange.removeListener(proxySettingsWatcher);
};

export const initProxySettingsWatcher = (): void => {
	if (proxySettingsWatcherInitialized || !browser.proxy) {
		return;
	}

	proxySettingsWatcherInitialized = true;
	browser.proxy.settings.onChange.addListener(proxySettingsWatcher);
};
