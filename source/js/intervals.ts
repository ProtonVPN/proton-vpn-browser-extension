import {milliSeconds} from './tools/milliSeconds';
import {BackgroundData} from './messaging/MessageType';
import {User} from './account/user/User';
import {canAccessPaidServers} from './account/user/canAccessPaidServers';

/** We use this to prioritize / increase frequency of updates for paid users. */
const useSlowFrequency = (() => {
	let paidServersAccessible = false;

	global.browser || ((global as any).browser = chrome);

	const listeners = {
		[BackgroundData.USER]({user}: {user: User | undefined}): void {
			paidServersAccessible = canAccessPaidServers(user);
		},
	} as Record<BackgroundData, (...args: any[]) => void>;

	browser.runtime.onMessage.addListener(
		(message: any) => {
			const type = message?.event as BackgroundData;
			listeners[type]?.(message as any);

			return false;
		},
	);

	return () => !paidServersAccessible;
})();

export const getLocationRefreshInterval = () => useSlowFrequency()
	? milliSeconds.fromMinutes(30)
	: milliSeconds.fromMinutes(10);

export const getNotificationsRefreshInterval = () => useSlowFrequency()
	? milliSeconds.fromDays(1)
	: milliSeconds.fromHours(6);

export const getLogicalCheckUpRefreshInterval = () => useSlowFrequency()
	? milliSeconds.fromMinutes(20)
	: milliSeconds.fromMinutes(5);

export const getLogicalLoadsRefreshInterval = () => useSlowFrequency()
	? milliSeconds.fromHours(1)
	: milliSeconds.fromMinutes(15);

/**
 * The delay at which we start to refresh logicals list in a non-blocking way
 * (background task invisible for the user).
 */
export const getLogicalsTTL = () => useSlowFrequency()
	? milliSeconds.fromDays(1)
	: milliSeconds.fromHours(6);

/**
 * The delay at which the logicals list is considered obsolete and user should
 * then wait for the refresh to complete (loading spinner) before it can
 * browse the list.
 */
export const getLogicalsBlockingUpdateTTL = () => getLogicalsTTL() * 8;

export const getPmUserTTL = () => useSlowFrequency()
	? milliSeconds.fromMinutes(20)
	: milliSeconds.fromMinutes(10);

export const getUserTTL = () => useSlowFrequency()
	? milliSeconds.fromMinutes(20)
	: milliSeconds.fromMinutes(10);

export const getServerCountsTTL = () => milliSeconds.fromDays(10);

export const getServerCountsBlockingUpdateTTL = () => getServerCountsTTL() * 2;

export const getServerCountsDisplayTTL = () => milliSeconds.fromHours(3);

export const getStreamingConfigTTL = () => useSlowFrequency()
	? milliSeconds.fromDays(7)
	: milliSeconds.fromDays(3);

export const getStreamingConfigBlockingUpdateTTL = () => getStreamingConfigTTL() * 3;

export const getCityTranslationMissingNamesTTL = () => milliSeconds.fromHours(1);

export const getCityTranslationNamesTTL = () => milliSeconds.fromDays(20);

export const getClientConfigTTL = () => milliSeconds.fromHours(12);

export const getClientConfigBlockingUpdateTTL = () => getClientConfigTTL() * 4;
