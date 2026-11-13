'use popup';
import type {ServerSummary} from '../../vpn/ConnectionState';
import {c, getCountryNameOrCode, msgid} from '../../tools/translate';
import {logo} from '../../tools/logo';
import {showConnectedItemMarker} from '../showConnectedItemMarker';
import {sendMessageToBackground} from '../../tools/sendMessageToBackground';
import {StateChange} from '../../messaging/MessageType';
import {getCountryFlag} from '../../tools/getCountryFlag';
import {connectEventHandler} from '../../tools/connectEventHandler';
import {toggleClass} from '../../tools/toggleClass';
import {via} from '../via';
import {aboutFreeConnections} from '../aboutFreeConnections';
import {triggerPromise} from '../../tools/triggerPromise';
import {refreshLocationSlots} from '../../account/refreshLocationSlots';
import {getLastChoices} from '../../vpn/lastChoice';
import {recentLocations} from '../recentLocations';
import type {PopupConnectionState} from './loadConnectionState';
import type {ServerRotator} from '../../vpn/ServerRotator';
import type {CountryList} from '../countryList';

export const getConnectionStatusRefresher = (
	state: {
		connected: boolean;
		restarted: boolean;
	},
	connectionState: PopupConnectionState,
	hasAccessToPaidServers: boolean,
	showFreeQuickConnect: boolean,
	browserExtensionEnabled: boolean,
	isSecureCoreEnabled: () => boolean,
	countries: CountryList,
	freeCountries: Record<string, true>,
	serverRotator: ServerRotator | undefined,
	area: HTMLElement,
	disconnectButton: HTMLButtonElement,
	quickConnectButton: HTMLButtonElement,
	serverStatusSlot: HTMLDivElement,
	servers: HTMLDivElement,
	freeCountriesListEl: HTMLDivElement,
	freeCountriesCountEl: HTMLSpanElement,
	freeCountriesDescriptionEl: HTMLSpanElement,
	freeCountryItemTemplate: HTMLTemplateElement,
	configureButtons: (slot: HTMLDivElement) => void,
	configureArea: (slot: HTMLDivElement) => void,
) => {
	const isFreeTier = !hasAccessToPaidServers;
	let connectionAttemptTime = 0;
	let connectingChecker: ReturnType<typeof setInterval> | undefined = undefined;

	return (server?: ServerSummary, connecting = false) => {
		if (!server) {
			server = connectionState?.server;
		}

		const exitCountry = server?.exitCountry || '';
		const entryCountry = server?.entryCountry || '';
		const secureCore = !!(entryCountry && entryCountry !== exitCountry);
		const exitCity = server?.exitCity || '';
		const name =
			exitCity +
			' ' +
			(server?.name || '').replace(new RegExp('^' + exitCountry + '#'), '#');
		const exitIp = server?.exitIp || '';
		const canDisconnectOrCancel = state.connected || connecting;
		disconnectButton.style.display = canDisconnectOrCancel ? 'block' : 'none';
		quickConnectButton.style.display =
			canDisconnectOrCancel && hasAccessToPaidServers ? 'none' : 'block';
		// nosemgrep:insecure-innerhtml
		quickConnectButton.innerHTML = canDisconnectOrCancel
			? c('Action').t`Change server`
			: c('Action').t`Connect`;
		quickConnectButton.classList[canDisconnectOrCancel ? 'add' : 'remove'](
			'weak',
		);
		area
			.querySelectorAll<HTMLDivElement>('.quick-connect-button-subtitle')
			.forEach((quickConnectSubtitle) => {
				if (hasAccessToPaidServers) {
					return;
				}

				quickConnectSubtitle.style.display = canDisconnectOrCancel
					? 'none'
					: 'block';
			});
		area
			.querySelectorAll<HTMLDivElement>('.quick-connect-button-incentive')
			.forEach((quickConnectIncentive) => {
				quickConnectIncentive.style.display = canDisconnectOrCancel
					? 'none'
					: 'block';
			});
		logo.switchTo(area, canDisconnectOrCancel ? 'protected' : 'unprotected');
		showConnectedItemMarker(
			servers,
			state.connected && !connecting,
			connectionState?.server,
			isSecureCoreEnabled,
		);

		serverRotator?.refreshState(canDisconnectOrCancel);

		if (connecting) {
			connectionAttemptTime = Date.now();
			connectingChecker = setInterval(async () => {
				await sendMessageToBackground(StateChange.CONNECTING, {
					connectionAttemptTime,
				});
			}, 500);
			disconnectButton.classList.remove('danger-hover');
			// nosemgrep:insecure-innerhtml
			disconnectButton.innerHTML = c('Action').t`Cancel`;
			serverStatusSlot.classList.remove('success', 'danger');
			// nosemgrep:insecure-innerhtml
			serverStatusSlot.innerHTML = `
				<div class="status-title">
					<div class="lds-ring"><div></div><div></div><div></div><div></div></div>
					<div id="connecting-label" class="protection-status">${c('Info').t`Connecting...`}</div>
				</div>

				<div class="current-server-description">
					<div class="current-server-flag">${getCountryFlag(exitCountry)}</div>
					<div>
						<div class="current-server-country">${getCountryNameOrCode(exitCountry)}</div>
						<div class="current-server-name">${name}</div>
						<div class="exit-ip">${exitIp}</div>
					</div>
				</div>
			`;

			return;
		}

		connectionAttemptTime = 0;

		if (connectingChecker) {
			clearInterval(connectingChecker);
		}

		connectEventHandler.finishConnection(state.connected);

		// nosemgrep:insecure-innerhtml
		disconnectButton.innerHTML = c('Action').t`Disconnect`;
		disconnectButton.classList.add('danger-hover');
		toggleClass(serverStatusSlot, state.connected, 'success', 'danger');

		const baseCountries = ['US', 'NL', 'JP'];
		const freeCountriesList = [
			...baseCountries.filter((country) => freeCountries[country]),
			...Object.keys(freeCountries).filter(
				(country) => !baseCountries.includes(country),
			),
		];

		// nosemgrep:insecure-innerhtml
		serverStatusSlot.innerHTML = state.connected
			? `
				<div class="status-title">
					<svg role="img" focusable="false" aria-hidden="true" class="protection-icon medium-icon" viewBox="0 0 24 24">
						<use xlink:href="img/icons.svg#protected"></use>
					</svg>
					<div id="protected-label" class="protection-status">${c('Label').t`Protected`}</div>
				</div>

				<div class="current-server-description">
					<div class="current-server-flag ${secureCore ? ' wide' : ''}">${
						(secureCore
							? `${getCountryFlag(entryCountry)} &nbsp;${via()}&nbsp;`
							: '') + getCountryFlag(exitCountry)
					}</div>
					<div>
						<div class="current-server-country">${getCountryNameOrCode(exitCountry)}</div>
						<div class="current-server-name">${name}</div>
						<div class="exit-ip">${exitIp}</div>
					</div>
				</div>
			`
			: `
				<div class="status-title">
					<svg role="img" focusable="false" aria-hidden="true" class="protection-icon medium-icon" viewBox="0 0 24 24">
						<use xlink:href="img/icons.svg#unprotected"></use>
					</svg>
					<div id="unprotected-label" class="protection-status">${c('Label').t`Unprotected`}</div>
				</div>

				${
					showFreeQuickConnect && browserExtensionEnabled
						? aboutFreeConnections(freeCountriesList)
						: ''
				}
			`;

		configureButtons(serverStatusSlot);

		if (
			isFreeTier &&
			freeCountriesListEl &&
			freeCountryItemTemplate &&
			freeCountriesCountEl
		) {
			// Clear the list
			let node = freeCountryItemTemplate.nextSibling;
			while (node) {
				const next = (node as unknown as {nextElementSibling: ChildNode})
					.nextElementSibling;
				freeCountriesListEl.removeChild(node);
				node = next;
			}

			// Fill the list with free countries
			Object.keys(freeCountries).forEach((countryCode) => {
				const clone =
					freeCountryItemTemplate.content.firstElementChild?.cloneNode(
						true,
					) as HTMLElement;
				if (clone) {
					const flagImg =
						clone.querySelector<HTMLImageElement>('.country-flag-img');
					const nameDiv = clone.querySelector<HTMLDivElement>('.country-name');

					if (flagImg) {
						flagImg.src = `/img/flags/${countryCode.toLowerCase()}.svg`;
						flagImg.alt = countryCode;
					}

					if (nameDiv) {
						nameDiv.setAttribute('data-country-code', countryCode);
						nameDiv.textContent = getCountryNameOrCode(countryCode);
					}

					freeCountriesListEl.appendChild(clone);
				}
			});

			const freeCountriesCount = Object.keys(freeCountries).length;
			freeCountriesCountEl.textContent = freeCountriesCount.toString();

			if (freeCountriesDescriptionEl) {
				/**
				 * 	translator: this appears to free user clicking on the info button about their free connection.
				 */
				freeCountriesDescriptionEl.textContent = c('Info').plural(
					freeCountriesCount,
					msgid`Proton Free automatically connects you to the fastest available free server from our ${freeCountriesCount} free country. This will normally be the closest server to your location.`,
					`Proton Free automatically connects you to the fastest available free server from our ${freeCountriesCount} free countries. This will normally be the closest server to your location.`,
				);
			}
		}

		triggerPromise(refreshLocationSlots(area, true));

		if (state.connected) {
			const recentLocationSlots = area.querySelectorAll<HTMLDivElement>(
				'.recent-locations-slot',
			);

			if (recentLocationSlots.length > 0) {
				getLastChoices().then((choices) => {
					recentLocationSlots.forEach((recentLocationSlot) => {
						// nosemgrep:insecure-innerhtml
						recentLocationSlot.innerHTML = recentLocations(choices, countries);
						configureArea(recentLocationSlot);
					});
				});
			}
		}
	};
};
