import {timeoutAfter} from './delay';

type Permissions = chrome.permissions.Permissions &
	browser.permissions.Permissions;

/**
 * Max time to wait for the browser to answer a permission check.
 * Past this delay, the permission is considered missing so the UI
 * never stays stuck (e.g. infinite spinner in the popup).
 */
const permissionCheckTimeout = 2_000;

export const hasBrowserPermission = async (
	permissions: Permissions,
	maxMilliSeconds = permissionCheckTimeout,
): Promise<boolean> => {
	try {
		return await timeoutAfter(
			new Promise<boolean>((resolve) => {
				chrome.permissions.contains(permissions, (result) => {
					// Reading lastError marks it as checked (avoids console warning)
					resolve(Boolean(!chrome.runtime.lastError && result));
				});
			}),
			maxMilliSeconds,
			'Permission check timed out',
		);
	} catch {
		return false;
	}
};
