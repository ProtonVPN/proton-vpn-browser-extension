'use popup';
import {c} from '../../tools/translate';
import {triggerPromise} from '../../tools/triggerPromise';
import {
	getPrivateWindowsMessage,
	isAllowedIncognitoAccess,
	openPrivateWindowsSettings,
	privateWindowsNoticeClosed,
} from '../../vpn/privateWindows/privateWindowsAccess';

/**
 * When the extension is not allowed in private/incognito windows, the proxy
 * does not apply there, warn the user even before their first connection.
 */
export const showPrivateWindowsNotice = async (
	slot: HTMLElement | null,
): Promise<void> => {
	if (
		!slot ||
		(await privateWindowsNoticeClosed.get())?.value ||
		(await isAllowedIncognitoAccess())
	) {
		return;
	}

	// nosemgrep:insecure-innerhtml
	slot.innerHTML = `<div class="error-message info-message">
		<div class="icon">
			<svg viewBox="0 0 15 14">
				<path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 13C10.8137 13 13.5 10.3137 13.5 7C13.5 3.68629 10.8137 1 7.5 1C4.18629 1 1.5 3.68629 1.5 7C1.5 10.3137 4.18629 13 7.5 13ZM7.5 14C11.366 14 14.5 10.866 14.5 7C14.5 3.13401 11.366 0 7.5 0C3.63401 0 0.5 3.13401 0.5 7C0.5 10.866 3.63401 14 7.5 14ZM9.24995 10C9.24995 10.3038 9.00371 10.55 8.69995 10.55H7.69995H6.69995C6.39619 10.55 6.14995 10.3038 6.14995 10C6.14995 9.69624 6.39619 9.45 6.69995 9.45H7.14995L7.14995 6.55H6.99994C6.69618 6.55 6.44994 6.30376 6.44994 6C6.44994 5.69624 6.69618 5.45 6.99994 5.45H7.69995C7.84582 5.45 7.98571 5.50795 8.08886 5.61109C8.19201 5.71424 8.24995 5.85413 8.24995 6L8.24995 9.45H8.69995C9.00371 9.45 9.24995 9.69624 9.24995 10ZM7.5 4.40002C7.8866 4.40002 8.2 4.08662 8.2 3.70002C8.2 3.31343 7.8866 3.00002 7.5 3.00002C7.1134 3.00002 6.8 3.31343 6.8 3.70002C6.8 4.08662 7.1134 4.40002 7.5 4.40002Z"/>
			</svg>
		</div>
		<div class="text">
			<span class="notice-text">${getPrivateWindowsMessage()}</span>
			<a href="#" class="text-link open-options-link">${c('Action').t`Open settings`}</a>
		</div>
		<button class="close-button" aria-label="${c('Info').t`Close`}">
			<svg viewBox="0 0 24 24">
				<path fill-rule="evenodd" d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>
			</svg>
		</button>
	</div>`;

	slot
		.querySelector('.open-options-link')
		?.addEventListener('click', (event) => {
			event.preventDefault();
			triggerPromise(
				openPrivateWindowsSettings().then(() => {
					window.close();
				}),
			);
		});

	slot.querySelector('.close-button')?.addEventListener('click', () => {
		triggerPromise(privateWindowsNoticeClosed.set({value: 1}));
		slot.innerHTML = '';
	});
};
