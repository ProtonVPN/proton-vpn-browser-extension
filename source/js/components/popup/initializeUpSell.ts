'use popup';
import {upsell} from '../../tools/upsell';
import {getUpdateError} from '../../tools/update';
import type {ApiError} from '../../api/ApiError';
import type {ErrorDump} from '../../vpn/ConnectionState';
import type {User} from '../../account/user/User';
import type {PopupConnectionState} from './loadConnectionState';

export const initializeUpSell = async (
	connectionState: PopupConnectionState,
	user: User,
	setError: (apiError: ApiError | Error | ErrorDump | undefined) => void,
) => {
	// A required extension update takes precedence over any other error,
	// API calls are short-circuited, so the popup may otherwise only show
	// cached data without telling the user anything is wrong.
	const updateError = await getUpdateError();

	if (updateError) {
		setError(updateError);

		return;
	}

	const browserExtensionEnabled = user?.VPN?.BrowserExtension || false;

	if (browserExtensionEnabled) {
		setError(connectionState.error);

		return;
	}

	setError(await upsell(user?.VPN?.BrowserExtensionPlan || 'VPN Plus'));
};
