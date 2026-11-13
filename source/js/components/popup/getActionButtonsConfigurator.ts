'use popup';
import {onClick} from '../onClick';
import {leaveWindowForTab} from '../../tools/openTab';
import {forgetAccount} from '../../account/forgetAccount';
import {manageAccountURL} from '../../config';
import {ErrorActionCode} from '../../api';
import {BackgroundAction, StateChange} from '../../messaging/MessageType';
import {setDisplayStyle} from '../../tools/setDisplayStyle';
import {sendMessageToBackground} from '../../tools/sendMessageToBackground';
import {closeErrorModal} from '../modals/closeErrorModal';
import {forgetUser} from '../../account/user/forgetUser';
import {forgetCredentials} from '../../account/credentials/removeCredentials';
import {reloadWindow} from '../../tools/reloadWindow';
import {appendUrlParams} from '../../tools/appendUrlParams';
import {getPrefillValues} from '../../tools/prefill';
import {getHashSeed, getQuerySeed} from '../../tools/translate';
import {updateAccessSentenceWithCounts} from '../accessSentence';
import {stopEvent} from '../../tools/stopEvent';
import {triggerPromise} from '../../tools/triggerPromise';
import {configureLinks} from '../links';
import {configureGoToButtons} from '../goToButton';
import type {PmUser} from '../../account/user/PmUser';

/**
 * Configure buttons that work without a logged-in user: links, error actions
 * (sign out, refresh), upgrade links and page navigation.
 *
 * Clicks on server buttons (those without `data-href`) are delegated to
 * `handleServerButtonClick` which is only available once logged in.
 */
export const getActionButtonsConfigurator = (
	area: HTMLElement,
	loggedView: HTMLElement | null,
	spinner: HTMLElement | null,
	proxySupported: boolean,
	goTo: (name: string) => void,
	closeSession: (action: StateChange) => Promise<void>,
	appendUpgradeParams: (url: string) => Promise<string>,
	getPmUser: () => Promise<PmUser | undefined>,
	handleServerButtonClick: (button: HTMLButtonElement) => Promise<void>,
) => {
	const configureActionButtons = (subArea?: HTMLElement) => {
		const handleLeavingAction = (url: string, forget: boolean) => {
			leaveWindowForTab(window, url);

			if (forget) {
				forgetAccount();
			}
		};

		const triggerLinkButton = async (link: string, button: HTMLElement) => {
			if (link === '{manageAccountURL}') {
				link = manageAccountURL;
			}

			const action = button.getAttribute('data-action');

			if (action === ErrorActionCode.SIGN_OUT) {
				await closeSession(StateChange.SIGN_OUT);

				return;
			}

			if (action === ErrorActionCode.REFRESH) {
				const errorModal = area.querySelector<HTMLDivElement>('#modal-error')!;
				const signInView = area.querySelector<HTMLElement>('#sign-in-view');
				setDisplayStyle(signInView, 'none');
				setDisplayStyle(errorModal, 'none');
				setDisplayStyle(spinner, 'block');
				await sendMessageToBackground(BackgroundAction.FORGET_ERROR);
				await closeErrorModal(
					errorModal,
					true,
					area,
					loggedView,
					spinner,
					proxySupported,
				);
				setDisplayStyle(signInView, 'none');
				setDisplayStyle(errorModal, 'none');
				setDisplayStyle(spinner, 'block');
				forgetUser();
				forgetCredentials();
				reloadWindow();

				return;
			}

			const forget = !!(
				button.classList.contains('upgrade-button') ||
				Number(button.getAttribute('data-forget-account'))
			);
			const href = appendUrlParams(
				link,
				await getPrefillValues(getQuerySeed(button.dataset), getPmUser),
				await getPrefillValues(getHashSeed(button.dataset), getPmUser),
			);

			if (Number(button.getAttribute('data-direct-upgrade'))) {
				handleLeavingAction(await appendUpgradeParams(href), forget);

				return;
			}

			if (Number(button.getAttribute('data-upgrade'))) {
				goTo('upgrade');
				const page = area.querySelector<HTMLDivElement>(
					'[data-page="upgrade"]',
				);

				if (page) {
					page.querySelectorAll('.open-upgrade-page').forEach((button) => {
						button.setAttribute('data-href', href);
						button.setAttribute('data-direct-upgrade', '1');
					});
					configureActionButtons(page);
					const url = await appendUpgradeParams(href);
					page.querySelectorAll('.open-upgrade-page').forEach((button) => {
						button.setAttribute('data-href', url);
						button.removeAttribute('data-direct-upgrade');
					});
					configureActionButtons(page);

					updateAccessSentenceWithCounts(page);
				}

				return;
			}

			handleLeavingAction(href, forget);
		};

		(subArea || area.querySelector('#servers') || area)
			.querySelectorAll<HTMLButtonElement>(
				'.open-upgrade-page, button[data-href], button[data-id], button[data-exitCountry], .connect-clickable, .server:not(.in-maintenance)',
			)
			.forEach((button) => {
				onClick(button, async (event) => {
					stopEvent(event);

					const href = button.getAttribute('data-href');

					if (href) {
						triggerPromise(triggerLinkButton(href, button));

						return;
					}

					await handleServerButtonClick(button);
				});
			});

		configureLinks(subArea || area, triggerLinkButton);
		configureGoToButtons(subArea || area, goTo);
	};

	return configureActionButtons;
};
