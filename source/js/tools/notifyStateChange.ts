import {broadcastMessage, ChangeStateMessage} from './broadcastMessage';

export function notifyStateChange(state: ChangeStateMessage['data']['state'], data: any = {}): void {
	if (data.error instanceof Error) {
		data.error = {
			message: data.error.message,
			stack: data.error.stack,
		};
	}

	broadcastMessage('changeState', {
		state,
		...data,
	});
}
