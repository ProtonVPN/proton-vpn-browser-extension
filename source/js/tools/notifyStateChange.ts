import type {ChangeStateMessage} from './broadcastMessage';
import {broadcastMessage} from './broadcastMessage';

export function notifyStateChange(
	state: ChangeStateMessage['data']['state'],
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: any = {},
): void {
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
