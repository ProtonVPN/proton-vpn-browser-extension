import {milliSeconds} from './tools/milliSeconds';
import {getRuntime} from './tools/getRuntime';
import {BackgroundData} from './messaging/MessageType';
import type {User} from './account/user/User';
import {canAccessPaidServers} from './account/user/canAccessPaidServers';

/**
 * We use this to prioritize / increase frequency of updates for paid users.
 * It checks if the current user can access paid servers, then returns a function
 * telling you whether the extension should poll Proton Servers at a slower frequency.
 */
const useSlowFrequency = (() => {
	let paidServersAccessible = false;

	const listeners = {
		[BackgroundData.USER]({user}: {user: User | undefined}): void {
			paidServersAccessible = canAccessPaidServers(user);
		},
	} as Record<BackgroundData, (...args: any[]) => void>;

	getRuntime()?.onMessage.addListener((message: any) => {
		const type = message?.event as BackgroundData;
		listeners[type]?.(message as any);

		return false;
	});

	return () => !paidServersAccessible;
})();

/** This returns the activity check interval in milliseconds, which is 20000ms (that being 20sec). */
export const getActivityCheckInterval = () => milliSeconds.fromSeconds(20);

/**
 * This returns the location refresh interval, which is either:
 * - 1800000ms (or 30min) for free tier users.
 * - 600000ms (or 10min) for paying users.
 */
export const getLocationRefreshInterval = () =>
	useSlowFrequency()
		? milliSeconds.fromMinutes(30)
		: milliSeconds.fromMinutes(10);

/**
 * This returns the notifications refresh interval, which is either:
 * - 86400000ms (or 24h) for free tier users.
 * - 21600000ms (or 6h)  for paying users.
 */
export const getNotificationsRefreshInterval = () =>
	useSlowFrequency() ? milliSeconds.fromDays(1) : milliSeconds.fromHours(6);

/**
 * This returns the logical check-up refresh interval, which is either:
 * - 1200000ms (or 20min) for free tier users.
 * - 300000ms  (or 5min)  for paying users.
 */
export const getLogicalCheckUpRefreshInterval = () =>
	useSlowFrequency()
		? milliSeconds.fromMinutes(20)
		: milliSeconds.fromMinutes(5);

/**
 * This returns the logical loads refresh interval, which is either:
 * - 3600000ms (or 1h) for free tier users.
 * - 900000ms (or 15min) for paying users.
 */
export const getLogicalLoadsRefreshInterval = () =>
	useSlowFrequency() ? milliSeconds.fromHours(1) : milliSeconds.fromMinutes(15);

/**
 * This returns the delay at which we start to refresh logicals list in a non-blocking way
 * (background task invisible for the user). This delay is either:
 * - 86400000ms (or 24h) for free tier users.
 * - 21600000ms (or 6h)  for paying users.
 */
export const getLogicalsTTL = () =>
	useSlowFrequency() ? milliSeconds.fromDays(1) : milliSeconds.fromHours(6);

/**
 * This returns the delay at which the logicals list is considered obsolete and user should
 * then wait for the refresh to complete (loading spinner) before it can
 * browse the list.
 */
export const getLogicalsBlockingUpdateTTL = () => getLogicalsTTL() * 8;

/**
 * This returns the delay at which the logicals list is considered obsolete and user should
 * then wait for the refresh to complete (loading spinner) before it can
 * browse the list.
 */
export const getPmUserTTL = () =>
	useSlowFrequency()
		? milliSeconds.fromMinutes(20)
		: milliSeconds.fromMinutes(10);

/** This returns the delay at which the cached user data is considered obsolete and user data should be freshly requested. */
export const getUserTTL = () =>
	useSlowFrequency()
		? milliSeconds.fromMinutes(20)
		: milliSeconds.fromMinutes(10);

/** This returns the TTL (time-to-live value) for the user blocking update, which is 259200000ms (that being 3 days) */
export const getUserBlockingUpdateTTL = () => milliSeconds.fromDays(3);

/** This returns the TTL (=time-to-live value) for the server counts in milliseconds, which is 864000000ms (that being 10 days) */
export const getServerCountsTTL = () => milliSeconds.fromDays(10);

/** This returns the TTL (=time-to-live value) for the server counts blocking update in milliseconds, which is 1728000000ms (that being 20 days) */
export const getServerCountsBlockingUpdateTTL = () => getServerCountsTTL() * 2;

/** This returns the TTL (=time-to-live value) for the server counts display in milliseconds, which is 10800000ms (that being 3h) */
export const getServerCountsDisplayTTL = () => milliSeconds.fromHours(3);

/**
 * This returns the TTL (=time-to-live value) for the streaming config, which is either:
 * - 604800000ms (or 7 days) for free tier users.
 * - 259200000ms (or 3 days) for paying users.
 */
export const getStreamingConfigTTL = () =>
	useSlowFrequency() ? milliSeconds.fromDays(7) : milliSeconds.fromDays(3);

/**
 * This returns the TTL (=time-to-live value) for the streaming config blocking update, which is either:
 * - 1814400000ms (or 21 days) for free tier users.
 * - 778200000ms  (or 9 days)  for paying users.
 */
export const getStreamingConfigBlockingUpdateTTL = () =>
	getStreamingConfigTTL() * 3;

/** This returns the TTL (=time-to-live value) for the city translation missing names list in milliseconds, which is 3600000 (that being 1h) */
export const getCityTranslationMissingNamesTTL = () =>
	milliSeconds.fromHours(1);

/** This returns the TTL (=time-to-live value) for the city translation names list in milliseconds, which is 1728000000ms (that being 20 days) */
export const getCityTranslationNamesTTL = () => milliSeconds.fromDays(20);

/** This returns the TTL (=time-to-live value) for the client config in milliseconds, which is 43200000ms (that being 12h) */
export const getClientConfigTTL = () => milliSeconds.fromHours(12);

/** This returns the TTL (=time-to-live value) for the client config blocking update in milliseconds, which is 172800000ms (that being 2 days) */
export const getClientConfigBlockingUpdateTTL = () => getClientConfigTTL() * 4;

/**
 * This returns the TTL (=time-to-live value) for the feature flag, which is either:
 * - 86400000ms (or 1 day) for free tier users.
 * - 21600000ms (or 6h)    for paying users.
 */
export const getFeatureFlagTTL = () =>
	useSlowFrequency() ? milliSeconds.fromDays(1) : milliSeconds.fromHours(6);

/**
 * This returns the idle threshold, which is either:
 * - 259200000ms (or 3 days) for free tier users.
 * - 604800000ms (or 7 days) for paying users.
 */
export const getIdleThreshold = () =>
	useSlowFrequency() ? milliSeconds.fromDays(3) : milliSeconds.fromDays(7);
