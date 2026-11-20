'use background';
import type {Credentials} from '../../account/credentials/Credentials';
import {current, isCurrentStateConnected} from './stateStore';
import {connectLogical} from './actions';
import {getCurrentState} from './bootstrap';
import {getLogicalCheckUpRefreshInterval} from '../../intervals';
import {delay} from '../../tools/delay';
import {getReplacementServer} from '../getReplacementServer';
import {checkNetwork} from '../checkNetwork';

/**
 * Periodically checks that the logical connected to is still up,
 * and switches to a replacement server if it is not.
 */

let lastLogicalCheck = 0;

/** Wait a full refresh interval before the next check-up (e.g. after connecting) */
export const postponeLogicalCheckUp = (): void => {
	lastLogicalCheck = Date.now();
};

export async function checkLogicalIsUp(
	// Read after the delay below, so pass the state object itself, not its values
	state: {readonly initializedAt: number; readonly proxyEnabled: boolean},
	credentials?: Credentials,
): Promise<void> {
	const time = Date.now();
	const id = current()?.data?.server?.id;

	if (!id || time - lastLogicalCheck < getLogicalCheckUpRefreshInterval()) {
		return;
	}

	const initializedAt = state.initializedAt;
	lastLogicalCheck = time;

	try {
		await delay(500);

		if (!state.proxyEnabled || !isCurrentStateConnected()) {
			return;
		}

		const {logical, server} =
			(await getReplacementServer(id, getCurrentState, credentials)) || {};

		if (
			logical &&
			server &&
			initializedAt === getCurrentState().initializedAt
		) {
			await connectLogical(
				logical,
				server,
				current()?.data?.server?.splitTunneling,
			);
		}
	} catch (e) {
		checkNetwork(e);
	}
}
