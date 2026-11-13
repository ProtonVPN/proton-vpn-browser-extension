'use background';
import {broadcastMessage} from '../tools/broadcastMessage';
import {milliSeconds} from '../tools/milliSeconds';
import {
	isConnectivityError,
	lastPageNetworkError,
	pageNetworkErrorMessageType,
	type PageNetworkErrorMessage,
} from '../tools/pageNetworkError';
import {triggerPromise} from '../tools/triggerPromise';

const minimumInterval = milliSeconds.fromSeconds(5);

let lastRecordedTime = 0;

/**
 * Record page loading failures due to connectivity errors so the popup can
 * check whether the device is offline (see watchPageNetworkErrors).
 *
 * Nothing is sent over the network here: the popup only probes connectivity
 * when it is open, so the user can actually see the result.
 */
export const onPageError = (
	details: {error?: string},
	now = Date.now(),
): void => {
	if (
		!isConnectivityError(details.error) ||
		now - lastRecordedTime < minimumInterval
	) {
		return;
	}

	lastRecordedTime = now;
	triggerPromise(lastPageNetworkError.setValue(now));
	broadcastMessage<PageNetworkErrorMessage>(pageNetworkErrorMessageType);
};

export const initPageNetworkErrorWatcher = (): void => {
	const webRequest = (browser as unknown as typeof chrome).webRequest;

	if (
		!webRequest?.onErrorOccurred ||
		webRequest.onErrorOccurred.hasListener(onPageError)
	) {
		return;
	}

	webRequest.onErrorOccurred.addListener(onPageError, {
		urls: ['<all_urls>'],
		types: ['main_frame', 'sub_frame'],
	});
};
