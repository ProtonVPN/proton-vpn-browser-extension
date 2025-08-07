import { Storage, storage } from '../tools/storage';
import { triggerPromise } from '../tools/triggerPromise';

/**
 * The transitive state that needs to be synchronized across tabs for the "Change Server" functionality for free users.
 */
export interface ServerRotatorState {
	/** The number of server changes the user made. */
	changesCount?: number;
	/** Timestamp [ms] for the next allowed change. */
	nextChange?: number;
}

// We are using Storage.LOCAL to synchronize the client state between all tabs to prevent free refresh exploits. There is no point in synchronizing to different browsers where the user is signed in (Storage.SYNC).
const serverRotatorStore = storage.item<ServerRotatorState>('server-rotator', Storage.LOCAL);

export const getServerRotatorState = async (): Promise<ServerRotatorState> => {
	return (await serverRotatorStore.get() ?? {}) as Promise<ServerRotatorState>;
};

export async function setServerRotatorState(partialState: Partial<ServerRotatorState>): Promise<ServerRotatorState> {
	const state = await getServerRotatorState()

	const mergedState: ServerRotatorState = {
		...state!,
		...partialState,
	}

	triggerPromise(await serverRotatorStore.set(mergedState))
	return mergedState
}
