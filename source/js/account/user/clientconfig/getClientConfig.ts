import {fetchWithUserInfo} from '../../fetchWithUserInfo';
import {getClientConfigBlockingUpdateTTL, getClientConfigTTL} from '../../../intervals';
import {getCacheAge} from '../../../tools/getCacheAge';
import {triggerPromise} from '../../../tools/triggerPromise';
import {clientConfigStore} from './storedClientConfig';
import type {ChangeServerConfig, ClientConfig, ClientConfigCache, RatingSettings} from './storedClientConfig';

let cache: ClientConfigCache | undefined = undefined;

const fetchClientConfig = async () => {
	const value = await fetchWithUserInfo<ClientConfig>('vpn/v2/clientconfig');

	triggerPromise(clientConfigStore.set({
		time: Date.now(),
		value,
	}));

	return value;
};

const getClientConfig = async () => {
	const store = await clientConfigStore.get();

	if (store && (!cache || store.time > cache.time)) {
		cache = store;
	}

	const age = getCacheAge(cache);

	// Use cache if fresh
	if (cache && age < getClientConfigTTL()) {
		return cache.value;
	}

	// Use cache but refresh in the background if it's a bit old but still good to use
	if (cache && age < getClientConfigBlockingUpdateTTL()) {
		triggerPromise(fetchClientConfig());

		return cache.value;
	}

	// Wait for the updated values from API if cache is empty or too old
	try {
		return await fetchClientConfig();
	} catch (e) {
		if (cache?.value) {
			return cache.value;
		}

		throw e;
	}
};

/** Only the portion of the state relevant to Rating Booster Modal functionality. */
export const getReviewInfoConfig = async (): Promise<RatingSettings> => (await getClientConfig()).RatingSettings;

/** Only the portion of the state relevant to ChangeServer functionality. */
export const getChangeServerConfig = async (): Promise<ChangeServerConfig> => {
	const clientConfig = await getClientConfig();

	return {
		ChangeServerAttemptLimit: clientConfig.ChangeServerAttemptLimit,
		ChangeServerShortDelayInSeconds: clientConfig.ChangeServerShortDelayInSeconds,
		ChangeServerLongDelayInSeconds: clientConfig.ChangeServerLongDelayInSeconds,
	};
};
