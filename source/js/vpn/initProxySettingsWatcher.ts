import {disconnect, isCurrentStateConnected} from '../state';
import {isConnected} from '../vpn/connectedServer';
import {c} from '../tools/translate';
import LevelOfControl = browser.types.LevelOfControl;

const getDisconnectionMessage = (levelOfControl: LevelOfControl, newProxy: any): string => {
	const host = newProxy?.host || '';
	const port = newProxy?.port || '';
	const hasProxyInfo = Boolean(host || port);
	const newProxyName = hasProxyInfo ? `${host}:${port}` : '';

	if (levelOfControl === 'controlled_by_other_extensions') {
		if (hasProxyInfo) {
			return c('Info').t`Disconnected by another extension, it connected to ${newProxyName}`;
		}

		return c('Info').t`Disconnected by another extension`;
	}

	if (hasProxyInfo) {
		return c('Info').t`Disconnected, settings were overridden to ${newProxyName}`;
	}

	return c('Info').t`Disconnected, settings were overridden`;
};

export const initProxySettingsWatcher = (): void => {
	browser.proxy.settings.onChange.addListener(async event => {
		const connected = isCurrentStateConnected() || (await isConnected());

		if (!connected) {
			// Don't bother if Proton VPN is not currently connected
			return;
		}

		if (event.levelOfControl === 'controlled_by_this_extension') {
			// Action from the user or auto-reconnection
			return;
		}

		disconnect(new Error(getDisconnectionMessage(
			event.levelOfControl,
			event.value?.rules?.singleProxy,
		)));
	});
};
