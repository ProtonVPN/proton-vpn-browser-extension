import {connect, getCurrentState} from '../state';
import {connectedServer} from './connectedServer';
import {setCurrentIdleState} from '../tools/idle';

export const initIdleWatcher = (): void => {
	browser.idle.onStateChanged.addListener(async (newState) => {
		setCurrentIdleState(newState);

		if (newState !== 'active') {
			return;
		}

		const state = getCurrentState();

		if (state?.name !== 'on' && (state?.data?.error as any)?.httpStatus === -1) {
			const server = (await connectedServer.get())?.value;

			if (server) {
				await connect({server});
			}
		}
	});
};
