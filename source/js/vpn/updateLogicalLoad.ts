import {setJitterInterval} from '../tools/delay';
import {broadcastMessage} from '../tools/broadcastMessage';
import type {BroadcastLogicals} from './getLogicals';
import {loadLoads} from './getLogicals';
import {warn} from '../log/log';
import {getLogicalLoadsRefreshInterval} from '../intervals';

export const updateLogicalLoad = () => {
	let consecutiveLoadFailures = 0;
	let lastUpdate = new Date(Date.now());
	const interval = getLogicalLoadsRefreshInterval();

	setJitterInterval(interval, interval / 5, async () => {
		try {
			broadcastMessage<BroadcastLogicals>('logicalUpdate', await loadLoads());
			lastUpdate = new Date(Date.now());
			consecutiveLoadFailures = 0;
		} catch (e) {
			if (++consecutiveLoadFailures > 5) {
				warn(
					'Loagical load update failed after ' +
						consecutiveLoadFailures +
						' attempts, last update was ',
					lastUpdate,
					e,
				);
			}
		}
	});
};
