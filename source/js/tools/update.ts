import {Storage, storage} from './storage';
import {appVersion} from '../config';
import {catchPromise} from './triggerPromise';
import {milliSeconds} from './milliSeconds';
import {ApiError} from '../api';

type UpgradeErrorCachedItem = {
	version: string,
	time: number,
	error: ApiError | undefined,
};

let upgradeError: UpgradeErrorCachedItem | undefined = undefined;

const upgradeErrorCache = storage.item<UpgradeErrorCachedItem>('upgrade-error', Storage.LOCAL, 'error');

export const setUpdateError = (error: ApiError | undefined): void => {
	upgradeError = {
		version: appVersion,
		time: Date.now(),
		error,
	};

	if (!error) {
		catchPromise(upgradeErrorCache.remove());

		return;
	}

	catchPromise(upgradeErrorCache.set(upgradeError));
};

export const getUpdateError = async (): Promise<ApiError | undefined> => {
	if (!upgradeError) {
		upgradeError = await upgradeErrorCache.get();

		if (!upgradeError) {
			setUpdateError(undefined);
		}
	}

	if (!upgradeError) {
		return undefined;
	}

	if (upgradeError.version !== appVersion || Date.now() - upgradeError.time > milliSeconds.fromHours(2)) {
		setUpdateError(undefined);

		return undefined;
	}

	return upgradeError.error;
};
