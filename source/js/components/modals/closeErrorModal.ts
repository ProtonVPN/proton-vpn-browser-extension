import {triggerPromise} from '../../tools/triggerPromise';
import {storage} from '../../tools/storage';
import {showSigningViewAndWaitForItToBeLoaded} from '../signIn/showSigningView';

export const closeErrorModal = async (
	errorModal: HTMLElement,
	restartOnClose?: boolean | undefined,
	area?: HTMLElement | null,
	loggedView?: HTMLElement | null,
	spinner?: HTMLElement | null,
	proxySupported?: boolean,
) => {
	const id = errorModal.getAttribute('data-error-id');
	restartOnClose ??= Boolean(
		Number(errorModal.getAttribute('data-error-restart-on-close')),
	);

	if (id) {
		triggerPromise(storage.setItem('closed-' + id, {value: 1}));
	}

	errorModal.style.display = 'none';

	if (restartOnClose && area) {
		await showSigningViewAndWaitForItToBeLoaded(
			area.querySelector<HTMLElement>('#sign-in-view'),
			loggedView || null,
			spinner || null,
			proxySupported,
		);
	}
};
