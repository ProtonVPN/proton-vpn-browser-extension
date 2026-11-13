'use background';
import {getProxyLevelOfControl} from '../../tools/proxy';
import {milliSeconds} from '../../tools/milliSeconds';

type LevelOfControl = chrome.types.LevelOfControl | undefined;

let proxyControlCheck: Promise<LevelOfControl> | undefined;
let proxyControlCheckEndedAt = 0;
let proxyLevelOfControl: LevelOfControl = undefined;

/**
 * Same as getProxyLevelOfControl() but as it can take up to 5 seconds,
 * a call in progress is shared, and its result is reused for 2 seconds after it ended.
 */
export const checkProxyLevelOfControl = (): Promise<LevelOfControl> => {
	if (proxyControlCheck) {
		return proxyControlCheck;
	}

	if (Date.now() - proxyControlCheckEndedAt < milliSeconds.fromSeconds(2)) {
		return Promise.resolve(proxyLevelOfControl);
	}

	proxyControlCheck = getProxyLevelOfControl()
		.then((levelOfControl) => {
			proxyLevelOfControl = levelOfControl;

			return levelOfControl;
		})
		.finally(() => {
			proxyControlCheck = undefined;
			proxyControlCheckEndedAt = Date.now();
		});

	return proxyControlCheck;
};

/**
 * Same as isProxyControlledByOtherExtensions() but sharing the calls
 * and results of checkProxyLevelOfControl().
 */
export const checkProxyControlledByOtherExtensions =
	async (): Promise<boolean> =>
		(await checkProxyLevelOfControl()) === 'controlled_by_other_extensions';
