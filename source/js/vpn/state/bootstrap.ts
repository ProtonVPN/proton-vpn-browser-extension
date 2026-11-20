'use background';
/**
 * Bootstrapping of the connection state: lazily create it, restore it from
 * the stored connected server (or auto-connect) and notify ready waiters.
 *
 * Modules that only need to read the current state should import it from
 * here rather than from state.ts, so they don't depend on the whole
 * connect/disconnect/logout graph.
 */
import type {ConnectionState} from '../ConnectionState';
import type {StateName} from './stateStore';
import {
	createInitialState,
	getCurrentStateIfDefined,
	switchState,
} from './stateStore';
import {connectedServer} from '../connectedServer';
import {getAccessToken} from '../../account/getAccessToken';
import {bind, debug as debug_, info as info_} from '../../log/log';

const debug = bind(debug_, '[state]');
const info = bind(info_, '[state]');

/**
 * Actions needed to restore the state, registered by actions.ts so that this
 * module doesn't import it (which would bring back the import cycles).
 */
export interface RestorationActions {
	connectAfter(
		data: ConnectionState['data'],
		previousName: string | undefined,
	): Promise<void>;
	checkAutoConnect(): Promise<void>;
}

let restorationActions: RestorationActions | undefined;

export const defineRestorationActions = (actions: RestorationActions): void => {
	restorationActions = actions;
};

const getRestorationActions = (): RestorationActions => {
	if (!restorationActions) {
		throw new Error('State restoration actions are not defined');
	}

	return restorationActions;
};

async function getDisconnectedState(): Promise<StateName> {
	try {
		return (await getAccessToken()) ? 'off' : 'loggedout';
	} catch {
		return 'loggedout';
	}
}

let ready = false;
let starters = [] as (() => void)[];

export function getCurrentState(): ConnectionState {
	const existingState = getCurrentStateIfDefined();

	if (existingState) {
		return existingState;
	}

	info('New state creation');
	const state = createInitialState();
	connectedServer
		.get()
		.then(async (data) => {
			const {connectAfter, checkAutoConnect} = getRestorationActions();
			const server = data?.value;

			if (server) {
				await connectAfter({server}, server.name);

				return;
			}

			debug('[getCurrentState]', data?.value);
			switchState(await getDisconnectedState());
			await checkAutoConnect();
		})
		.finally(() => {
			ready = true;

			starters.forEach((resolve) => {
				resolve();
			});

			starters = [];
		});

	return state;
}

export function waitForReadyState(): Promise<void> {
	return new Promise<void>((resolve) => {
		if (ready) {
			resolve();

			return;
		}

		starters.push(resolve);
		getCurrentState();
	});
}
