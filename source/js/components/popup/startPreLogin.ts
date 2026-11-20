'use popup';
import {getLogicalById} from '../../vpn/getLogicals';
import type {ErrorDump} from '../../vpn/ConnectionState';
import {sendMessageToBackground} from '../../tools/sendMessageToBackground';
import {appendUpgradeParams as doAppendUpgradeParams} from '../../account/appendUpgradeParams';
import type {ApiError} from '../../api/ApiError';
import type {User} from '../../account/user/User';
import {storage} from '../../tools/storage';
import {triggerPromise} from '../../tools/triggerPromise';
import {StateChange} from '../../messaging/MessageType';
import {showSigningView} from '../signIn/showSigningView';
import {connectEventHandler} from '../../tools/connectEventHandler';
import {configureCallbackOnce} from '../../tools/configureCallbackOnce';
import {initializePopup} from './initializePopup';
import {getErrorHandler} from './errorHandler';
import {transformErrorForPopup} from './transformErrorForPopup';
import {watchOfflineStatusAndErrors} from './watchOfflineStatusAndErrors';
import {watchPageNetworkErrors} from './watchPageNetworkErrors';
import {getSessionCloser} from './closeSession';
import {getActionButtonsConfigurator} from './getActionButtonsConfigurator';
import type {PopupConnectionState} from './loadConnectionState';
import type {PopupState} from './PopupState';

let stopOfflineWatchers: (() => void) | undefined;

/**
 * First phase of the popup start: everything that must work before (or
 * without) a logged-in user, e.g. displaying errors and their action buttons
 * (sign out, refresh, account links).
 *
 * Data that only exists after login is read through getters with safe
 * defaults, set by the post-login phase via the returned setters.
 */
export const startPreLogin = async (area: HTMLElement, state: PopupState) => {
	const initialization = await initializePopup(area);

	if (!initialization) {
		return undefined;
	}

	const {
		getPmUser,
		spinner,
		loggedView,
		errorModal,
		proxySupported,
		errorSlot,
		goTo,
	} = initialization;

	const {setError, configureErrorHandler} = getErrorHandler();

	const {callback: getUser, set: setUserGetter} = configureCallbackOnce<
		() => User | undefined
	>('getUser', () => undefined);

	const {callback: getConnectionState, set: setConnectionStateGetter} =
		configureCallbackOnce<() => PopupConnectionState | undefined>(
			'getConnectionState',
			() => undefined,
		);

	const {callback: beforeDisconnect, set: setBeforeDisconnect} =
		configureCallbackOnce<() => void>('beforeDisconnect', () => {});

	const {callback: handleServerButtonClick, set: setServerButtonClickHandler} =
		configureCallbackOnce<(button: HTMLButtonElement) => Promise<void>>(
			'handleServerButtonClick',
		);

	const disconnect = async (type: StateChange = StateChange.DISCONNECT) => {
		const previousServer = getConnectionState()?.server;
		const previousLogical = previousServer?.id
			? getLogicalById(previousServer.id)
			: undefined;

		state.connected = false;
		beforeDisconnect();

		connectEventHandler.disconnect(previousLogical, previousServer);

		await sendMessageToBackground(type);
	};

	const closeSession = getSessionCloser(
		window,
		document,
		area,
		() => state.connected,
		disconnect,
	);

	const appendUpgradeParams = (url: string) =>
		doAppendUpgradeParams(url, getUser(), getPmUser);

	const configureActionButtons = getActionButtonsConfigurator(
		area,
		loggedView,
		spinner,
		proxySupported,
		goTo,
		closeSession,
		appendUpgradeParams,
		getPmUser,
		handleServerButtonClick,
	);

	let lastRenderId = 0;

	const renderError = (apiError: ApiError | Error | ErrorDump | undefined) => {
		// transformErrorForPopup is async and doesn't take the same time for
		// every error (e.g. undefined is immediate), only the latest call wins
		const renderId = ++lastRenderId;

		transformErrorForPopup(apiError).then(
			({id, blockingError, error, restartOnClose}) => {
				if (renderId !== lastRenderId) {
					return;
				}

				errorModal.setAttribute(
					'data-error-restart-on-close',
					restartOnClose ? '1' : '0',
				);
				errorModal.style.display = blockingError ? 'flex' : 'none';

				if (id) {
					errorModal.setAttribute('data-error-id', id);
				}

				// nosemgrep:insecure-innerhtml
				errorModal.querySelector<HTMLDivElement>(
					'.modal-error-slot',
				)!.innerHTML = blockingError;

				// nosemgrep:insecure-innerhtml
				errorSlot.innerHTML = error;
				errorSlot.querySelectorAll('.close-button').forEach((button) => {
					button.addEventListener('click', () => {
						if (id) {
							triggerPromise(storage.setItem('closed-' + id, {value: 1}));
						}

						const block = button.parentNode as HTMLDivElement;
						block.parentNode?.removeChild(block);

						if (restartOnClose) {
							showSigningView(
								area.querySelector('#sign-in-view'),
								loggedView,
								spinner,
								proxySupported,
							);
						}
					});
				});
				configureActionButtons(errorSlot);
				configureActionButtons(errorModal);
			},
		);
	};

	stopOfflineWatchers?.();

	// Let the user know when websites won't load because the device is offline
	// (not because of the VPN), connection logic stays unchanged, and hide
	// network errors meanwhile as the offline notice already explains them.
	const {setError: setErrorUnlessOffline, offlineStatus} =
		watchOfflineStatusAndErrors(
			area.querySelector<HTMLElement>('.offline-slot'),
			renderError,
		);

	// Page loading failures are also a hint the device may be offline
	const stopPageNetworkErrors = watchPageNetworkErrors(offlineStatus.check);

	stopOfflineWatchers = () => {
		offlineStatus.stop();
		stopPageNetworkErrors();
	};

	configureErrorHandler(setErrorUnlessOffline);

	return {
		...initialization,
		setError,
		disconnect,
		closeSession,
		appendUpgradeParams,
		configureActionButtons,
		setUserGetter,
		setConnectionStateGetter,
		setBeforeDisconnect,
		setServerButtonClickHandler,
	};
};

export type PreLoginContext = NonNullable<
	Awaited<ReturnType<typeof startPreLogin>>
>;
