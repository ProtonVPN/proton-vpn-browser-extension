import {fetchJson} from '../api';
import {getCacheAge} from '../tools/getCacheAge';
import {CacheWrappedValue, Storage, storage} from '../tools/storage';
import {triggerPromise} from '../tools/triggerPromise';
import {getStreamingConfigBlockingUpdateTTL, getStreamingConfigTTL} from '../intervals';

export interface StreamingService {
	Name: string;
	Icon: string;
}

interface StreamingConfig {
	ResourceBaseURL: string;
	StreamingServices: {
		[country: string]: {
			[tier: string]: StreamingService[];
		}
	}
}

type StreamingConfigCache = CacheWrappedValue<StreamingConfig>;

let streamingConfig: StreamingConfigCache | undefined = undefined;

const streamingServers = storage.item<StreamingConfigCache>('streaming-services', Storage.LOCAL);

const fetchStreamingConfig = async () => {
	const config = await fetchJson<StreamingConfig>('vpn/streamingservices');
	streamingConfig = {time: Date.now(), value: config};
	triggerPromise(streamingServers.set(streamingConfig));

	return config;
};

export const getStreamingConfig = async () => {
	const cache = await streamingServers.get();

	if (cache && (!streamingConfig || cache.time > streamingConfig.time)) {
		streamingConfig = cache;
	}

	const age = getCacheAge(streamingConfig);

	// Use cache if fresh
	if (streamingConfig && age < getStreamingConfigTTL()) {
		return streamingConfig.value;
	}

	// Use cache but refresh in the background if it's a bit old but still good to use
	if (streamingConfig && age < getStreamingConfigBlockingUpdateTTL()) {
		triggerPromise(fetchStreamingConfig());

		return streamingConfig.value;
	}

	// Wait for the updated values from API if cache is empty or too old
	try {
		return await fetchStreamingConfig();
	} catch (e) {
		if (streamingConfig?.value) {
			return streamingConfig.value;
		}

		throw e;
	}
};
