import {fetchTranslations, translateArea, c} from './tools/translate';
import {sendMessageToBackground} from './tools/sendMessageToBackground';
import {watchBroadcastMessages} from './tools/answering';
import {BackgroundAction, StateChange} from './messaging/MessageType';
import type {ChangeStateMessage} from './tools/broadcastMessage';
import {triggerPromise} from './tools/triggerPromise';

/** Kill switch page: shown instead of a website the kill switch blocked (see initKillSwitchPage). */

fetchTranslations().then(() => {
	translateArea(document);
});

const blockedUrl = new URLSearchParams(location.search).get('url') || '';
const buttons = document.querySelectorAll<HTMLButtonElement>('button');
const status = document.querySelector<HTMLParagraphElement>('.status-text')!;

const setBusy = (busy: boolean, message = '') => {
	buttons.forEach((button) => {
		button.disabled = busy;
	});
	status.textContent = message;
};

const goBack = () => {
	// Only http(s), never let the query string navigate to javascript: or other schemes
	if (/^https?:\/\//.test(blockedUrl)) {
		location.replace(blockedUrl);
	}
};

let disconnecting = false;

// Also works when the user reconnects or disconnects from the popup
watchBroadcastMessages({
	changeState(data: ChangeStateMessage['data']) {
		if (
			(data.state === 'connected' && !data.error) ||
			(data.state === 'disconnected' && !data.blocked)
		) {
			goBack();

			return;
		}

		if (data.state === 'disconnected' && !disconnecting) {
			setBusy(false, c('Error').t`Unable to reconnect, please try again.`);
		}
	},
});

document
	.querySelector('.reconnect-button')
	?.addEventListener('click', async () => {
		setBusy(true, c('Info').t`Reconnecting…`);

		try {
			await sendMessageToBackground(BackgroundAction.RECONNECT);
		} catch {
			setBusy(false, c('Error').t`Unable to reconnect, please try again.`);
		}
	});

document.querySelector('.disconnect-button')?.addEventListener('click', () => {
	disconnecting = true;
	setBusy(true);
	triggerPromise(sendMessageToBackground(StateChange.DISCONNECT));
});
