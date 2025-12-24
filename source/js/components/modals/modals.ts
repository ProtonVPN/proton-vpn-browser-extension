'use popup';

/* Available pre-defined attributes. */

const attr = {
	/** Any element with this attribute within a <dialog> parent will trigger the default close action. */
	close: 'data-modal-default-close',
	/** A <dialog> element with this attribute will trigger close action when clicked outside of it. */
	closeOutside: 'data-modal-default-close-outside',
};

const dataset = {
	close: 'modalDefaultClose',
	closeOutside: 'modalDefaultCloseOutside',
};

/**
 * Attaches listeners to modal buttons when the extension popup opens. Can be called repeatedly (idempotent).
 *
 * When a listener is configured, the attribute's value is set,
 * which invalidates the querySelector that is only looking for `=""` empty attributes,
 * avoiding setting duplicate listeners.
 */
export function configureModalButtons(modalsRoot: HTMLDivElement) {
	setCloseButtonAction(modalsRoot);
	setCloseOutsideAction(modalsRoot)
}

/** Set default close action for each element with `data-modal-default-close` attribute. */
function setCloseButtonAction(modalsRoot: HTMLDivElement) {
	modalsRoot.querySelectorAll<HTMLButtonElement>(`[${attr.close}=""]`).forEach(button => {
		button.dataset[dataset.close] = 'set';
		button.addEventListener('click', () => closeModal(button));
	});
}

/** Detect click outside the modal dialog to close it on dialogs with `data-modal-default-close-outside` attribute. */
function setCloseOutsideAction(modalsRoot: HTMLDivElement) {
	if (modalsRoot.dataset[dataset.closeOutside] === 'set') {
		return; // Already configured.
	}

	modalsRoot.dataset[dataset.closeOutside] = 'set';
	modalsRoot.addEventListener('click', (event) => {
		const modal = (event.target as HTMLElement)?.closest<HTMLDialogElement>(
			`dialog[${attr.closeOutside}][open]`,
		);

		if (!modal) {
			return;
		}

		const rect = modal.getBoundingClientRect();
		const x = event.clientX;
		const y = event.clientY;
		const outside =
			x < rect.left ||
			x > rect.right ||
			y < rect.top ||
			y > rect.bottom;

		if (outside) {
			modal.close();
		}
	});
}

/** Open the closest modal dialog to the given element or **self** if it is a dialog. */
export function showModal(modalOrChild: HTMLElement | HTMLDialogElement) {
	modalOrChild.closest<HTMLDialogElement>('dialog')?.showModal();
}

/** Closes the closest modal dialog to the given element or **self** if it is a dialog. */
export function closeModal(modalOrChild: HTMLElement | HTMLDialogElement) {
	modalOrChild.closest<HTMLDialogElement>('dialog[open]')?.close();
}
