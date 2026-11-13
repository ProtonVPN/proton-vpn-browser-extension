'use popup';
import {accountURL} from '../../config';
import {handleError} from '../../tools/sentry';

export const attachPopupListener = (body: HTMLElement, target: Window) => {
	target.addEventListener(
		'message',
		(event: MessageEvent<string>) => {
			if (!event.origin.startsWith(accountURL)) {
				return;
			}

			if (event.data === 'endFork') {
				const accountFrame =
					body.querySelector<HTMLIFrameElement>('#account-frame');

				if (accountFrame) {
					accountFrame.style.display = 'none';
				}

				body.querySelectorAll<HTMLDivElement>('.main-area').forEach((area) => {
					area.style.display = 'block';
				});
			}
		},
		false,
	);

	target.addEventListener('unhandledrejection', handleError);
	target.addEventListener('error', handleError);
};
