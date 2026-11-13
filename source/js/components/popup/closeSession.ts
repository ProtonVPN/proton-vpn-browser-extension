'use popup';
import type {StateChange} from '../../messaging/MessageType';
import {c} from '../../tools/translate';
import {warn} from '../../log/log';
import {delay} from '../../tools/delay';

export const getSessionCloser =
	(
		window: Window,
		document: Document,
		area: HTMLElement,
		isConnected: () => boolean,
		disconnect: (type: StateChange) => Promise<void>,
	) =>
	async (action: StateChange) => {
		if (isConnected()) {
			const mainArea = area.querySelector<HTMLDivElement>('.main-area');

			if (mainArea) {
				const confirmModal = document.createElement('div');
				confirmModal.classList.add('confirm-modal');
				// nosemgrep:insecure-innerhtml
				confirmModal.innerHTML = `<div>
					${c('Confirm')
						.t`Logging out of the application will disconnect the active VPN connection. Do you want to continue?`}
					<div class="user-buttons-bar">
						<button data-st-action="cancel" class="tertiary-button" data-trans data-context="Action">Cancel</button>
						<button data-st-action="ok" class="primary-button" data-trans data-context="Action">OK</button>
					</div>
				</div>`;
				mainArea.appendChild(confirmModal);

				confirmModal
					.querySelectorAll<HTMLButtonElement>('[data-st-action="cancel"]')
					.forEach((button) => {
						button.addEventListener('click', () => {
							mainArea.removeChild(confirmModal);
						});
					});
				confirmModal
					.querySelectorAll<HTMLButtonElement>('[data-st-action="ok"]')
					.forEach((button) => {
						button.addEventListener('click', async () => {
							confirmModal
								.querySelectorAll<HTMLButtonElement>('[data-st-action]')
								.forEach((otherButton) => {
									otherButton.disabled = true;
								});

							try {
								await disconnect(action);
							} catch (e) {
								warn(e);
							} finally {
								await delay(1);
								window.close();
								mainArea.removeChild(confirmModal);
							}
						});
					});

				return;
			}
		}

		await disconnect(action);
		await delay(1);
		window.close();
	};
