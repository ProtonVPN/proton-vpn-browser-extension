'use popup';
import type {ServerSummary} from '../../vpn/ConnectionState';
import {Feature} from '../../vpn/Feature';
import {type Choice, setLastChoice} from '../../vpn/lastChoice';
import {ServerRotator} from '../../vpn/ServerRotator';
import {reloadWindow} from '../../tools/reloadWindow';
import {setDisplayStyle} from '../../tools/setDisplayStyle';
import {c, getTranslation, translateArea} from '../../tools/translate';
import {simplifiedUi} from '../../config';
import type {User} from '../../account/user/User';
import {getUserMaxTier} from '../../account/user/getUserMaxTier';
import {getLogicalFromButton as doGetLogicalFromButton} from '../getLogicalFromButton';
import type {CountryList} from '../countryList';
import {configureServerGroups} from '../configureServerGroups';
import {configureLookupSearch} from '../configureLookupSearch';
import {showConnectedItemMarker} from '../showConnectedItemMarker';
import {each} from '../../tools/each';
import {triggerPromise} from '../../tools/triggerPromise';
import {StateChange} from '../../messaging/MessageType';
import {showSigningView} from '../signIn/showSigningView';
import {locationList} from '../locationList';
import {getUserContext} from '../../account/user/getUserContext';
import {canAccessPaidServers} from '../../account/user/canAccessPaidServers';
import {configureCallback} from '../../tools/configureCallback';
import {configureCallbackOnce} from '../../tools/configureCallbackOnce';
import {configureGoToButtons} from '../goToButton';
import {configureModalButtons} from '../modals/modals';
import {configureRatingModalButtons} from '../modals/ratingModal';
import {getActiveNotifications} from '../../notifications/getNotifications';
import {configureQuickConnectButton} from '../configureQuickConnectButton';
import {loadServerList} from './loadServerList';
import {initializeUpSell} from './initializeUpSell';
import {getLogicalsCitiesAndFeatures} from './getLogicalsCitiesAndFeatures';
import {watchLanguageChange} from './watchLanguageChange';
import {loadConnectionState} from './loadConnectionState';
import {prepareCountryList} from './prepareCountryList';
import {initializeTelemetryBlock} from './initializeTelemetryBlock';
import {getConnectToServer} from './connectToServer';
import {getConnectionStatusRefresher} from './refreshConnectionStatus';
import {configureCentralView} from './configureCentralView';
import {configureSearch} from './configureSearch';
import {configureDebugTools} from './configureDebugTools';
import {loadPopupElements} from './loadPopupElements';
import {onUserPlanChange} from './onUserPlanChange';
import {loadPmUserIntoPopup} from './loadPmUserIntoPopup';
import {initializePlanSlot} from './initializePlanSlot';
import {configureLinksToAccountPage} from './configureLinksToAccountPage';
import {handleMessagesForPopup} from './handleMessagesForPopup';
import {finishPopupRendering} from './finishPopupRendering';
import {showPrivateWindowsNotice} from './showPrivateWindowsNotice';
import {getServerButtonsConfigurator} from './getServerButtonsConfigurator';
import type {PreLoginContext} from './startPreLogin';
import type {PopupState} from './PopupState';

/**
 * Second phase of the popup start: everything that needs a logged-in user,
 * the server list, features and connection state.
 */
export const startPostLogin = async (
	area: HTMLElement,
	state: PopupState,
	preLogin: PreLoginContext,
	user: User,
	restart: (area: HTMLElement) => Promise<void>,
) => {
	const {
		session,
		getPmUser,
		setPmUser,
		spinner,
		loggedView,
		proxySupported,
		initializeThemeSelector,
		errorSlot,
		region,
		goTo,
		configureGoTo,
		goToRegion,
		setError,
		disconnect,
		closeSession,
		appendUpgradeParams,
		configureActionButtons,
		setUserGetter,
		setConnectionStateGetter,
		setBeforeDisconnect,
		setServerButtonClickHandler,
	} = preLogin;

	setUserGetter(() => user);

	const userTier = getUserMaxTier(user);
	const userContext = await getUserContext(userTier);

	const [logicals, cities, features] =
		await getLogicalsCitiesAndFeatures(session);
	const isSecureCoreEnabled = () => features.secureCore.config.value;
	initializeTelemetryBlock(area, features.telemetry.feature);

	const countries: CountryList = {};
	const freeCountries = {} as Record<string, true>;

	watchLanguageChange(window, area, logicals.get, countries, cities);

	/** `MaxTier 2` */
	const hasAccessToPaidServers = canAccessPaidServers(user);

	/** `MaxTier 0` */
	const isFreeTier = !hasAccessToPaidServers;

	const browserExtensionEnabled = user?.VPN?.BrowserExtension || false;
	const limitedUi = !browserExtensionEnabled;

	const connectionState = await loadConnectionState();
	setConnectionStateGetter(() => connectionState);
	state.connected = !!connectionState?.server;
	triggerPromise(initializeUpSell(connectionState, user, setError));
	prepareCountryList(
		userTier,
		hasAccessToPaidServers,
		logicals.get(),
		countries,
		freeCountries,
	);

	if (!proxySupported) {
		return;
	}

	const {
		callback: refreshConnectionStatus,
		set: configureRefreshConnectionStatus,
	} = configureCallbackOnce<
		(server?: ServerSummary, connecting?: boolean) => void
	>('refreshConnectionStatus');
	const {callback: refresh, set: setRefresher} = configureCallback('refresh');

	const setLastChoiceWithCurrentOptions = (choice: Choice) => {
		const options = {
			excludedFeatures: 0,
			requiredFeatures: 0,
		};

		each(
			{
				[Feature.SECURE_CORE]: features.secureCore.config.value,
			},
			(feature, toggled) => {
				const key = toggled ? 'requiredFeatures' : 'excludedFeatures';
				options[key] = options[key] | Number(feature);
			},
		);

		each(options, (key, value) => {
			if (!value) {
				delete options[key];
			}
		});

		setLastChoice({
			...options,
			...choice,
		});
	};

	const rateUsModal = area.querySelector<HTMLDialogElement>('#rate-us');

	const connectToServer = getConnectToServer(
		rateUsModal,
		state,
		() => features,
		() => user,
		(error) => setError(error),
		refreshConnectionStatus,
	);

	const {configureServerButtons, handleServerButtonClick} =
		getServerButtonsConfigurator(
			area,
			isSecureCoreEnabled,
			goTo,
			goToRegion,
			(button: HTMLButtonElement) =>
				doGetLogicalFromButton(
					button,
					countries,
					features,
					userContext,
					logicals.get(),
					setError,
				),
			refresh,
			setLastChoiceWithCurrentOptions,
			connectToServer,
		);
	setServerButtonClickHandler(handleServerButtonClick);

	const configureButtons = (subArea?: HTMLElement) => {
		configureServerButtons(subArea);
		configureActionButtons(subArea);
	};

	setDisplayStyle(spinner, 'none');
	setDisplayStyle(loggedView, 'block');
	triggerPromise(
		showPrivateWindowsNotice(area.querySelector<HTMLElement>('.notice-slot')),
	);

	const {servers, setServersHtml} = loadServerList(
		area,
		limitedUi,
		(search: string) => {
			configureLookupSearch(
				servers,
				userContext,
				(div) => {
					configureButtons(div);
					configureServerGroups(div);
				},
				countries,
				search,
			);
		},
	);

	const configureArea = (subArea: HTMLElement) => {
		configureButtons(subArea);
		configureServerGroups(subArea);
		showConnectedItemMarker(
			subArea,
			state.connected,
			connectionState?.server,
			isSecureCoreEnabled,
		);
	};
	region.setConfigurator(configureArea);

	setRefresher(() => {
		locationList(
			countries,
			userContext,
			features.secureCore.config,
			features.recents,
		).then((list) => {
			setServersHtml(list);
			configureArea(area);
		});
	});
	refresh();

	// Load unique DOM elements
	const {
		serverStatusSlot,
		signOutButton,
		switchButton,
		menu,
		quickConnectButton,
		disconnectButton,
		freeCountriesListEl,
		freeCountriesCountEl,
		freeCountriesDescriptionEl,
		freeCountryItemTemplate,
	} = loadPopupElements(area);

	// nosemgrep:insecure-innerhtml
	disconnectButton.innerHTML = c('Action').t`Disconnect`;
	disconnectButton.addEventListener('click', async () => {
		await disconnect();
	});

	const showFreeQuickConnect = simplifiedUi && isFreeTier;

	const serverChangeRemainingTimeView = area.querySelector<HTMLDivElement>(
		'[data-page="server-change-remaining-time"]',
	)!;

	const serverRotator = isFreeTier
		? new ServerRotator(
				quickConnectButton,
				serverChangeRemainingTimeView,
				() => {
					goTo('server-change-remaining-time');
					configureButtons(serverChangeRemainingTimeView);
				},
			)
		: undefined;

	configureRefreshConnectionStatus(
		getConnectionStatusRefresher(
			state,
			connectionState,
			hasAccessToPaidServers,
			showFreeQuickConnect,
			browserExtensionEnabled,
			isSecureCoreEnabled,
			countries,
			freeCountries,
			serverRotator,
			area,
			disconnectButton,
			quickConnectButton,
			serverStatusSlot,
			servers,
			freeCountriesListEl,
			freeCountriesCountEl,
			freeCountriesDescriptionEl,
			freeCountryItemTemplate,
			configureButtons,
			configureArea,
		),
	);
	setBeforeDisconnect(() => {
		refreshConnectionStatus();
		setLastChoiceWithCurrentOptions({connected: false});
	});

	const activePromotionsPromise = getActiveNotifications();

	loadPmUserIntoPopup(area, setPmUser);
	onUserPlanChange(user, reloadWindow);

	initializePlanSlot(area, user);
	configureLinksToAccountPage(area, appendUpgradeParams);
	initializeThemeSelector();

	switchButton.style.display = 'flex';
	switchButton.title = c('Action').t`Switch account`;
	switchButton.addEventListener('click', async () => {
		await closeSession(StateChange.SWITCH_ACCOUNT);
	});
	signOutButton.style.display = 'flex';
	signOutButton.title = c('Action').t`Sign out`;
	signOutButton.addEventListener('click', async () => {
		await closeSession(StateChange.SIGN_OUT);
	});
	menu.style.display = 'block';
	configureQuickConnectButton(
		quickConnectButton,
		errorSlot,
		serverRotator,
		userContext,
		features,
		logicals,
		connectionState,
		limitedUi,
		showFreeQuickConnect,
		isFreeTier,
		state,
		getPmUser,
		connectToServer,
		setError,
	);

	setDisplayStyle(area.querySelector<HTMLDivElement>('#status'), 'block');
	refreshConnectionStatus();

	['aria-label', 'title'].forEach((attribute) => {
		area.querySelectorAll('[' + attribute + ']').forEach((button) => {
			button.setAttribute(
				attribute,
				getTranslation(
					button.getAttribute('data-context') || 'Info',
					([value]) => value,
					[button.getAttribute(attribute) as string],
				),
			);
		});
	});

	translateArea(document);

	area
		.querySelectorAll('[data-page="region"] .page-title .back-button')
		.forEach((button) => {
			button.addEventListener('click', () => {
				if (!region.back()) {
					goTo('world');
				}
			});
		});

	configureGoTo((page: string): void => {
		if (page !== 'region') {
			region.leave();
		}

		const zone =
			(page &&
				{
					// parent for each sub-page
					region: 'world',
					'split-tunneling': 'features',
				}[page]) ||
			page;

		area.querySelectorAll('[data-go-to]').forEach((b) => {
			b.classList[b.getAttribute('data-go-to') === zone ? 'add' : 'remove'](
				'active',
			);
			b.removeAttribute('aria-current');
		});

		if (page) {
			area
				.querySelectorAll<HTMLDivElement>('[data-page]')
				.forEach((pageBlock) => {
					const isActivePage = pageBlock.getAttribute('data-page') === page;
					pageBlock.classList[isActivePage ? 'add' : 'remove']('selected-page');

					if (isActivePage) {
						configureButtons(pageBlock);
					}
				});
		}

		area
			.querySelectorAll('.page-view, .page-view [data-page]')
			.forEach((pageBlock) => {
				pageBlock.scrollTop = 0;
			});

		if (loggedView) {
			loggedView.scrollTop = 0;
		}
	});

	configureGoToButtons(area, goTo);
	configureCentralView(area);
	configureSearch(
		area,
		servers,
		state,
		countries,
		userContext,
		features,
		userTier,
		isFreeTier,
		setServersHtml,
		refresh,
		setRefresher,
		configureArea,
	);
	configureModalButtons(area.querySelector<HTMLDivElement>('#modals')!);
	configureRatingModalButtons(rateUsModal);

	handleMessagesForPopup(
		logicals,
		connectionState,
		state,
		refreshConnectionStatus,
		setError,
		() =>
			showSigningView(
				area.querySelector('#sign-in-view'),
				loggedView,
				spinner,
				proxySupported,
			),
	);

	configureDebugTools(area, restart);

	await finishPopupRendering(
		area,
		goTo,
		user,
		activePromotionsPromise,
		getPmUser,
		() => (state.connected ? 'on' : 'off'),
	);
};
