'use background';
import type {ConnectionState, ConnectionStateSwitch} from '../ConnectionState';
import {connectedServer} from '../connectedServer';
import {triggerPromise} from '../../tools/triggerPromise';
import {bind, info as info_} from '../../log/log';

const info = bind(info_, '[state]');

export type StateName = 'on' | 'off' | 'loggedout';

/**
 * Holds the current connection state and switches between state definitions
 * by name, so that states can transition to each other (and modules can read
 * the current state) without importing the state definitions themselves.
 */
const definitions: Partial<Record<StateName, ConnectionStateSwitch>> = {};

let currentState: ConnectionState | undefined;

/** Register a state definition, so switchState(name) can use it */
export const defineState = <
	T extends ConnectionStateSwitch & {name: StateName},
>(
	definition: T,
): T => {
	definitions[definition.name] = definition;

	return definition;
};

export const getCurrentStateIfDefined = (): ConnectionState | undefined =>
	currentState;

/** Placeholder state until the actual one is restored from storage */
export const createInitialState = (): ConnectionState => {
	currentState = {data: {}} as ConnectionState;

	return currentState;
};

export const switchState = (name: StateName): void => {
	const definition = definitions[name];

	if (!definition) {
		throw new Error(`State "${name}" is not defined`);
	}

	const oldState = currentState;
	const state: ConnectionState = Object.assign({data: {}}, definition, {
		initializedAt: Date.now(),
	});
	currentState = state;
	info('Switch state to ' + state.name, state.data);
	state.init?.(oldState);
	// init() may already have switched to another state (e.g. "on" without
	// server switches to "off"), what follows applies to the state now current
	currentState.refreshState?.();
	triggerPromise(connectedServer.setValue(currentState.data?.server));
};

export const logIn = (): void => {
	switchState('off');
};

export const isLoggedIn = (): boolean =>
	!!currentState && currentState.name !== 'loggedout';

export const isCurrentStateConnected = (): boolean =>
	!!currentState && currentState.name === 'on';
