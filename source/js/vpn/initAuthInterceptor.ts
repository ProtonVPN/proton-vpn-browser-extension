import {clearPending} from '../tools/proxyAuth';
import {authHandler} from './authHandler';
import {getCurrentState} from '../state';
import {getCredentials} from '../account/credentials/getConnectionCredentials';
import {triggerPromise} from '../tools/triggerPromise';
import {watchWithSentry} from '../tools/sentry';
import {hasRefreshToken} from '../account/refreshToken';

const keepCredentialsReady = () => watchWithSentry((): undefined => {
	if (getCurrentState()?.proxyEnabled) {
		triggerPromise(getCredentials());
	}

	return undefined; // not BlockingResponse
});

const initAuthInterceptorListeners = (webRequest: typeof chrome.webRequest) => {
	const allUrls = {
		urls: ['<all_urls>'],
	};

	clearAuthInterceptor();

	webRequest.onBeforeRequest?.addListener(keepCredentialsReady, allUrls);

	if (!webRequest.onAuthRequired?.hasListener(authHandler)) {
		try {
			webRequest.onAuthRequired?.addListener(
				authHandler,
				allUrls,
				['asyncBlocking', 'extraHeaders'],
			);
		} catch (e) {
			webRequest.onAuthRequired?.addListener(
				authHandler,
				allUrls,
				['asyncBlocking'],
			);
		}
	}

	webRequest.onCompleted?.addListener(clearPending, allUrls);
	webRequest.onErrorOccurred?.addListener(clearPending, allUrls);
};

export const clearAuthInterceptor = () => {
	const webRequest = (browser as any as typeof chrome).webRequest;

	if (!webRequest) {
		return;
	}

	webRequest.onBeforeRequest?.removeListener(keepCredentialsReady);
	webRequest.onCompleted?.removeListener(clearPending);
	webRequest.onErrorOccurred?.removeListener(clearPending);
};

export const initAuthInterceptor = () => {
	const webRequest = (browser as any as typeof chrome).webRequest;

	if (!webRequest) {
		return;
	}

	initAuthInterceptorListeners(webRequest);

	hasRefreshToken().then(valid => {
		if (!valid) {
			clearAuthInterceptor();
		}
	});
};
