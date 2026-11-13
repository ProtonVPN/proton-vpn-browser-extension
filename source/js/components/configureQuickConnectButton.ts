'use popup';
import {c} from '../tools/translate';
import {excludeLogicalsFromCurrentCountry} from '../vpn/excludeLogicalsFromCurrentCountry';
import {filterLogicalsWithCurrentFeatures} from '../vpn/filterLogicalsWithCurrentFeatures';
import {requireBestLogical, requireRandomLogical} from '../vpn/getLogical';
import {setLastChoice} from '../vpn/lastChoice';
import {Feature} from '../vpn/Feature';
import {openTab} from '../tools/openTab';
import {appendUrlParams} from '../tools/appendUrlParams';
import {manageAccountURL} from '../config';
import {forgetAccount} from '../account/forgetAccount';
import type {ServerRotator} from '../vpn/ServerRotator';
import type {UserContext} from '../account/user/UserContext';
import type {AllFeatures} from '../vpn/features/AllFeatures';
import type {LogicalBag} from './popup/getLogicalsCitiesAndFeatures';
import type {PopupConnectionState} from './popup/loadConnectionState';
import type {PmUser} from '../account/user/PmUser';
import type {Logical} from '../vpn/Logical';

export const configureQuickConnectButton = (
	quickConnectButton: HTMLButtonElement,
	errorSlot: HTMLElement,
	serverRotator: ServerRotator | undefined,
	userContext: UserContext,
	features: AllFeatures,
	logicals: LogicalBag,
	connectionState: PopupConnectionState | undefined,
	limitedUi: boolean,
	showFreeQuickConnect: boolean,
	isFreeTier: boolean,
	state: {connected: boolean},
	getPmUser: () => Promise<PmUser | undefined>,
	connectToServer: (logical: Logical) => Promise<void>,
	errorHandler?: (error: Error) => void,
) => {
	// nosemgrep:insecure-innerhtml
	quickConnectButton.innerHTML = limitedUi
		? c('Action').t`Upgrade`
		: showFreeQuickConnect
			? c('Action').t`Connect`
			: c('Action').t`Quick connect`;
	quickConnectButton.addEventListener('click', async () => {
		if (isFreeTier && state.connected) {
			if (await serverRotator!.isPending()) {
				serverRotator!.showModal();

				return;
			}

			errorSlot.innerHTML = '';

			const alienLogicals = excludeLogicalsFromCurrentCountry(
				logicals.get(),
				connectionState?.server?.exitCountry,
			);
			const filteredLogicals = filterLogicalsWithCurrentFeatures(
				alienLogicals,
				userContext.tier,
				features.secureCore.config,
			);
			const logical = requireRandomLogical(
				filteredLogicals,
				userContext,
				errorHandler,
			);
			setLastChoice({
				connected: true,
				pick: 'random',
				excludedFeatures: Feature.SECURE_CORE,
			});

			await connectToServer(logical);

			await serverRotator!.startCountdown();

			return;
		}

		if (limitedUi) {
			await openTab(
				appendUrlParams(manageAccountURL, {email: (await getPmUser())?.Email}),
			);
			forgetAccount();

			return;
		}

		errorSlot.innerHTML = '';
		const logical = requireBestLogical(
			filterLogicalsWithCurrentFeatures(
				logicals.get(),
				userContext.tier,
				features.secureCore.config,
			),
			userContext,
			errorHandler,
		);
		setLastChoice({
			connected: true,
			pick: 'fastest',
			...(features.secureCore.config.value
				? {requiredFeatures: Feature.SECURE_CORE}
				: {excludedFeatures: Feature.SECURE_CORE}),
		});

		await connectToServer(logical);
	});
};
