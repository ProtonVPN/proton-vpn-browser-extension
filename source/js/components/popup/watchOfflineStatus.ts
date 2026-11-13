'use popup';
import {c} from '../../tools/translate';
import {probeConnectivity} from '../../tools/probeConnectivity';
import {milliSeconds} from '../../tools/milliSeconds';
import {triggerPromise} from '../../tools/triggerPromise';

/**
 * `navigator.onLine === false` reliably means the device is offline,
 * but `true` only means *some* network interface is connected. On Windows
 * in particular, virtual adapters (Hyper-V "vEthernet (Default Switch)" used
 * by WSL2 and Docker, VirtualBox/VMware host-only networks, VPN TAP/WireGuard
 * adapters...) stay connected when Wi-Fi is turned off, so both Chrome and
 * Firefox keep reporting `navigator.onLine === true`.
 *
 * As this only affects a minority of users, we don't send requests to
 * double-check it up front: only after a network error happened, we confirm
 * with a request that is never proxied (see probeConnectivity), meaning a
 * failure is due to the device network and not to the VPN.
 */
export const isNavigatorOffline = (target: Window): boolean =>
	target.navigator?.onLine === false;

export const isDeviceOffline = async (
	target: Window,
	probe: () => Promise<boolean> = probeConnectivity,
): Promise<boolean> => isNavigatorOffline(target) || !(await probe());

const getOfflineNoticeHtml =
	() => `<div class="error-message info-message offline-message">
	<div class="icon">
		<svg viewBox="0 0 15 14">
			<path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 13C10.8137 13 13.5 10.3137 13.5 7C13.5 3.68629 10.8137 1 7.5 1C4.18629 1 1.5 3.68629 1.5 7C1.5 10.3137 4.18629 13 7.5 13ZM7.5 14C11.366 14 14.5 10.866 14.5 7C14.5 3.13401 11.366 0 7.5 0C3.63401 0 0.5 3.13401 0.5 7C0.5 10.866 3.63401 14 7.5 14ZM9.24995 10C9.24995 10.3038 9.00371 10.55 8.69995 10.55H7.69995H6.69995C6.39619 10.55 6.14995 10.3038 6.14995 10C6.14995 9.69624 6.39619 9.45 6.69995 9.45H7.14995L7.14995 6.55H6.99994C6.69618 6.55 6.44994 6.30376 6.44994 6C6.44994 5.69624 6.69618 5.45 6.99994 5.45H7.69995C7.84582 5.45 7.98571 5.50795 8.08886 5.61109C8.19201 5.71424 8.24995 5.85413 8.24995 6L8.24995 9.45H8.69995C9.00371 9.45 9.24995 9.69624 9.24995 10ZM7.5 4.40002C7.8866 4.40002 8.2 4.08662 8.2 3.70002C8.2 3.31343 7.8866 3.00002 7.5 3.00002C7.1134 3.00002 6.8 3.31343 6.8 3.70002C6.8 4.08662 7.1134 4.40002 7.5 4.40002Z"/>
		</svg>
	</div>
	<div class="text">
		<strong class="offline-title">${c('Info').t`You're offline`}</strong>
		<span class="offline-text">${c('Info').t`Websites won't load until your device is back online. This isn't caused by the VPN: your settings are kept and you'll be protected as soon as your internet connection returns.`}</span>
	</div>
</div>`;

export type OfflineStatusWatcher = {
	/** Whether the offline notice is currently displayed */
	isOffline(): boolean;
	/**
	 * Check connectivity now with an actual request, to be called after a
	 * network error, as navigator.onLine may wrongly claim to be online.
	 */
	check(): Promise<void>;
	stop(): void;
};

export type OfflineStatusWatcherOptions = {
	target?: Window;
	probe?: () => Promise<boolean>;
	onChange?: (offline: boolean) => void;
	/**
	 * Delay before checking again once a check found the device offline
	 * despite navigator.onLine, as no "online" event will tell us when
	 * it's back
	 */
	offlineRecheckDelay?: number;
};

/**
 * Display an informative notice in the given slot while the device is
 * offline, and keep it up to date as connectivity changes while the popup
 * is open.
 *
 * No request is sent unless check() is called (after a network error), and
 * then only until the device is found to be online again.
 *
 * This is only informative: it never blocks nor alters the VPN connection.
 */
export const watchOfflineStatus = (
	slot: HTMLElement | null,
	{
		target = window,
		probe = probeConnectivity,
		onChange,
		offlineRecheckDelay = milliSeconds.fromSeconds(5),
	}: OfflineStatusWatcherOptions = {},
): OfflineStatusWatcher => {
	let offline = false;
	let stopped = false;
	let pendingCheck: Promise<void> | undefined = undefined;
	let timer: ReturnType<typeof setTimeout> | undefined = undefined;
	let eventId = 0;

	const setOffline = (value: boolean) => {
		if (stopped || value === offline) {
			return;
		}

		offline = value;

		if (slot) {
			// nosemgrep:insecure-innerhtml
			slot.innerHTML = offline ? getOfflineNoticeHtml() : '';
		}

		onChange?.(offline);
	};

	const check = (): Promise<void> => {
		if (!pendingCheck) {
			clearTimeout(timer);
			const checkId = ++eventId;
			const currentCheck = isDeviceOffline(target, probe)
				.then((value) => {
					// A connectivity event happened meanwhile, it's more recent
					if (checkId !== eventId) {
						return;
					}

					setOffline(value);

					// Only keep checking while offline, so the notice is hidden
					// soon after the connection is back
					if (value && !stopped && !isNavigatorOffline(target)) {
						timer = setTimeout(() => {
							triggerPromise(check());
						}, offlineRecheckDelay);
					}
				})
				.finally(() => {
					// Don't forget a newer check started after a connectivity event
					if (pendingCheck === currentCheck) {
						pendingCheck = undefined;
					}
				});
			pendingCheck = currentCheck;
		}

		return pendingCheck;
	};

	if (!slot) {
		return {
			isOffline: () => false,
			check: () => Promise.resolve(),
			stop: () => {},
		};
	}

	// navigator.onLine changes are free to follow, and false is reliable
	const onConnectivityEvent = () => {
		eventId++;
		// Outdated: a check() from now on must send a new probe
		pendingCheck = undefined;
		clearTimeout(timer);
		setOffline(isNavigatorOffline(target));
	};

	target.addEventListener('online', onConnectivityEvent);
	target.addEventListener('offline', onConnectivityEvent);
	setOffline(isNavigatorOffline(target));

	return {
		isOffline: () => offline,
		check,
		stop() {
			stopped = true;
			clearTimeout(timer);
			target.removeEventListener('online', onConnectivityEvent);
			target.removeEventListener('offline', onConnectivityEvent);
		},
	};
};
