'use background';
// Side-effect imports: register the state definitions so switchState() can use them
import './vpn/state/on';
import './vpn/state/off';
import './vpn/state/loggedout';
import {isCurrentStateConnected} from './vpn/state/stateStore';
import {triggerPromise} from './tools/triggerPromise';
import {updateLastActivityTime} from './tools/activity';
import {getActivityCheckInterval} from './intervals';

// This module must be loaded by the bundle entry point (background loads it
// through initState.ts) so the state definitions above get registered.
// Re-exports are kept for compatibility, prefer importing from
// ./vpn/state/* directly to avoid import cycles.
export {
	getCurrentStateIfDefined,
	isCurrentStateConnected,
	isLoggedIn,
	logIn,
	switchState,
} from './vpn/state/stateStore';
export {
	getAuthCredentials,
	isProxyKnownHost,
} from './vpn/state/knownProxyHosts';
export {
	checkAutoConnect,
	connect,
	connectAfter,
	connectLogical,
	disconnect,
	disconnectByProxyTakeover,
	logOut,
} from './vpn/state/actions';
export {getCurrentState, waitForReadyState} from './vpn/state/bootstrap';

setInterval(() => {
	if (isCurrentStateConnected()) {
		triggerPromise(updateLastActivityTime());
	}
}, getActivityCheckInterval());
