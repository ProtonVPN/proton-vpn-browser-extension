'use popup';
import {setUpSearch} from '../../search/setUpSearch';
import {delay} from '../../tools/delay';
import {locationListOrSearch} from '../locationListOrSearch';
import type {CountryList} from '../countryList';
import type {UserContext} from '../../account/user/UserContext';
import type {AllFeatures} from '../../vpn/features/AllFeatures';
import type {FeatureWrapper} from '../../vpn/features/FeatureWrapper';
import type {LoadedFeature} from '../../vpn/features/loadAllFeatures';
import type {Toggle} from '../../vpn/features/Toggle';
import type {LocallyStoredFeature} from '../../vpn/features/LocallyStoredFeature';
import {toggleButtons} from '../toggleButtons';
import {forgetLastChoices} from '../../vpn/lastChoice';
import {preventLeak} from '../../webrtc/preventLeak';
import {setWebRTCState} from '../../webrtc/setWebRTCState';
import {WebRTCState} from '../../webrtc/state';
import {configureSplitTunneling} from '../configureSplitTunneling';
import {sendMessageToBackground} from '../../tools/sendMessageToBackground';
import {SettingChange} from '../../messaging/MessageType';
import {getSplitTunnelingConfig} from '../../vpn/getSplitTunnelingConfig';

export const configureSearch = (
	area: HTMLElement,
	servers: HTMLDivElement,
	state: {connected: boolean},
	countries: CountryList,
	userContext: UserContext,
	features: AllFeatures,
	userTier: number,
	isFreeTier: boolean,
	setServersHtml: (html: string, search?: string) => void,
	refresh: () => void,
	setRefresher: (refresher: () => void) => void,
	configureArea: (slot: HTMLElement) => void,
) => {
	const search = area.querySelector<HTMLInputElement>('#search-input');

	if (!search) {
		return;
	}

	search.focus();
	search.onkeyup = (e) => {
		if (e.key === 'Enter' || e.keyCode === 13) {
			servers.querySelector<HTMLElement>('.server, .connect-option')?.click();
		}
	};
	let lastSearchStart = 0;
	setRefresher(
		setUpSearch(search, async (searchText) => {
			const searchStart = Date.now();
			lastSearchStart = searchStart;

			if (!servers.querySelector(':scope > .spinner')) {
				setServersHtml(`<div class="spinner">
					<div class="lds-ring"><div></div><div></div><div></div><div></div></div>
				</div>`);
			}

			// Wait a bit for consecutive letters typed
			await delay(searchText === '' ? 1 : 300);

			if (lastSearchStart !== searchStart) {
				return;
			}

			setServersHtml(
				await locationListOrSearch(
					searchText,
					countries,
					userContext,
					features,
				),
				searchText,
			);
			configureArea(area);
		}),
	);

	const setUpToggleButtonForFeature = (
		feature: LoadedFeature<
			FeatureWrapper<Toggle> & LocallyStoredFeature<Toggle>
		>,
		options?: {
			refresh?: (newValue?: boolean) => void;
			buttonSelector?: string;
			upgradeNeeded?: boolean;
		},
	) =>
		toggleButtons(area, feature.feature.getCacheItem(), feature.config, {
			feature,
			...options,
		});
	setUpToggleButtonForFeature(features.secureCore, {
		refresh,
		upgradeNeeded: isFreeTier,
	});
	setUpToggleButtonForFeature(features.notification);
	setUpToggleButtonForFeature(features.autoConnect);
	setUpToggleButtonForFeature(features.killSwitch);
	setUpToggleButtonForFeature(features.telemetry);
	setUpToggleButtonForFeature(features.recents, {
		upgradeNeeded: isFreeTier,
		refresh: (newValue) => {
			if (!newValue) {
				forgetLastChoices();
				area
					.querySelectorAll<HTMLDivElement>('.recent-locations-slot')
					.forEach((slot) => {
						slot.innerHTML = '';
					});
			}
		},
	});
	setUpToggleButtonForFeature(features.crashReport, {
		buttonSelector: '.crash-button',
	});
	setUpToggleButtonForFeature(features.preventWebrtcLeak, {
		refresh: async (newValue) => {
			await (state.connected
				? preventLeak(newValue)
				: setWebRTCState(WebRTCState.CLEAR));
		},
	});
	configureSplitTunneling(
		features.splitTunneling,
		undefined,
		area,
		async (updatedList) => {
			if (state.connected) {
				await sendMessageToBackground(
					SettingChange.BYPASS_LIST,
					getSplitTunnelingConfig(
						userTier,
						updatedList || features.splitTunneling.config,
					),
				);
			}
		},
		userTier <= 0,
	);
};
