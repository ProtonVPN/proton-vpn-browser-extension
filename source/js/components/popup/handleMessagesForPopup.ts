'use popup';
import {watchBroadcastMessages} from '../../tools/answering';
import type {
	ChangeStateMessage,
	ExtensionUpdate,
} from '../../tools/broadcastMessage';
import type {Logical} from '../../vpn/Logical';
import type {LogicalBag} from './getLogicalsCitiesAndFeatures';
import type {PopupConnectionState} from './loadConnectionState';
import type {ErrorDump, ServerSummary} from '../../vpn/ConnectionState';
import type {ApiError} from '../../api/ApiError';

export const handleMessagesForPopup = (
	logicals: LogicalBag,
	connectionState: PopupConnectionState,
	state: {connected: boolean},
	refreshConnectionStatus: (
		server: ServerSummary | undefined,
		connecting?: boolean,
	) => void,
	setError: (apiError: ApiError | Error | ErrorDump | undefined) => void,
	goToSigningView: () => void,
) => {
	watchBroadcastMessages({
		logicalUpdate(logicalsInput: Logical[]) {
			logicals.setIfNotEmpty(logicalsInput);
		},
		changeState(data: ChangeStateMessage['data']) {
			switch (data.state) {
				case 'connected':
					state.connected = true;
					connectionState.server = data.server;
					connectionState.error = data.error;
					refreshConnectionStatus(data.server);
					setError(data.error);
					break;

				case 'connecting':
					state.connected = false;
					connectionState.server = data.server;
					refreshConnectionStatus(data.server, true);
					setError(data.error);
					break;

				case 'logged-out':
					goToSigningView();
					break;

				case 'disconnected':
					state.connected = false;
					connectionState.server = undefined;
					connectionState.blocked = data.blocked;
					refreshConnectionStatus(data.server);
					setError(data.error);
					break;
			}
		},
		updateExtension(data: ExtensionUpdate['data']) {
			if (data?.error) {
				setError(data.error);
			}
		},
		error: setError,
	});
};
