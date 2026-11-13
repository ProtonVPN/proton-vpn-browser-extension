import {c} from '../../tools/translate';
import {storage} from '../../tools/storage';
import {getBrowser} from '../../tools/getBrowser';
import {openTab} from '../../tools/openTab';

/** Set when the user explicitly closed the notice in the popup */
export const privateWindowsNoticeClosed = storage.item<{value: number}>(
	'closed-private-windows-notice',
);

/** Set once the system notification has been emitted, so it's shown only once */
export const privateWindowsNotificationSent = storage.item<{value: number}>(
	'sent-private-windows-notification',
);

/**
 * When the extension is not allowed in private (Firefox) or incognito
 * (Chrome) windows, the proxy settings it sets don't apply there,
 * so the traffic in those windows is not protected.
 */
export const isAllowedIncognitoAccess = async (): Promise<boolean> => {
	if (!chrome.extension?.isAllowedIncognitoAccess) {
		// Can't tell, so don't warn
		return true;
	}

	return Boolean(await chrome.extension.isAllowedIncognitoAccess());
};

export const getPrivateWindowsMessage = (): string =>
	getBrowser().type === 'firefox'
		? c('Info')
				.t`Allow Proton VPN to protect your traffic in private windows. Open the menu → Add-ons and themes → Proton VPN → Details → Run in Private Windows: Allow.`
		: c('Info')
				.t`Allow Proton VPN to protect your traffic in incognito windows. Open the menu → Extensions → Manage Extensions → Proton VPN → Details → Allow in Incognito.`;

/**
 * Open the closest page to the private/incognito windows setting
 * of the extension.
 *
 * Firefox refuses to open about:addons from an extension, but
 * openOptionsPage() opens it on our extension page (embedded options_ui),
 * the setting is then in the "Details" tab.
 *
 * Chromium browsers allow opening chrome://extensions which, with ?id=,
 * lands directly on the details page where "Allow in Incognito" is.
 */
export const openPrivateWindowsSettings = async (): Promise<void> => {
	if (getBrowser().type === 'firefox') {
		await chrome.runtime.openOptionsPage();

		return;
	}

	await openTab(`chrome://extensions/?id=${chrome.runtime.id}`);
};
