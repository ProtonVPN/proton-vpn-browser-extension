'use popup';
import {Logical} from './vpn/Logical';
import {getLogicalById, getSortedLogicals} from './vpn/getLogicals';
import {readSession} from './account/readSession';
import {sendMessageToBackground} from './tools/sendMessageToBackground';
import {getInfoFromBackground} from './tools/getInfoFromBackground';
import {startSession} from './account/createSession';
import {
	c,
	fetchTranslations,
	getCountryName,
	getCountryNameOrCode,
	getHashSeed,
	getQuerySeed,
	getTranslation,
	translateArea,
} from './tools/translate';
import {escapeHtml} from './tools/escapeHtml';
import {ApiError, isUnauthorizedError} from './api';
import {saveSession} from './account/saveSession';
import {User} from './account/user/User';
import {PmUser} from './account/user/PmUser';
import {getUserMaxTier} from './account/user/getUserMaxTier';
import {
	accountURL,
	autoConnectEnabled,
	manageAccountURL,
	secureCoreEnabled,
	secureCoreQuickButtonEnabled,
	simplifiedUi,
	splitTunnelingEnabled,
} from './config';
import {refreshLocationSlots} from './account/refreshLocationSlots';
import {getAllLogicals, requireBestLogical, requireRandomLogical} from './vpn/getLogical';
import {getCities, mergeTranslations} from './vpn/getCities';
import {setUpSearch} from './search/setUpSearch';
import {countryList, CountryList} from './components/countryList';
import {configureServerGroups} from './vpn/configureServerGroups';
import {storage} from './tools/storage';
import {showNotifications} from './notifications/showNotifications';
import {watchBroadcastMessages} from './tools/answering';
import {ChangeStateMessage} from './tools/broadcastMessage';
import {getErrorMessage} from './tools/getErrorMessage';
import {ConnectionState, ErrorDump, ServerSummary} from './vpn/ConnectionState';
import {Feature} from './vpn/Feature';
import {getCountryFlag} from './tools/getCountryFlag';
import {each} from './tools/each';
import {logo} from './tools/logo';
import {Choice, setLastChoice} from './vpn/lastChoice';
import {ucfirst} from './tools/ucfirst';
import {toggleButtons} from './components/toggleButtons';
import {triggerPromise} from './tools/triggerPromise';
import {BackgroundData, SettingChange, StateChange} from './messaging/MessageType';
import {showSigningView} from './components/signIn/showSigningView';
import {delay, timeoutAfter} from './tools/delay';
import {proxyPermission} from './vpn/proxyPermission';
import {
	getTelemetryOptIn,
	isTelemetryFeatureEnabled,
	telemetryOptIn,
} from './tools/telemetry';
import {leaveWindowForTab, openTab} from './tools/openTab';
import {getSearchResult} from './search/getSearchResult';
import {upsell} from './tools/upsell';
import {forgetAccount} from './account/forgetAccount';
import {hideIf} from './tools/hideIf';
import {storedPreventWebrtcLeak} from './webrtc/storedPreventWebrtcLeak';
import {preventLeak} from './webrtc/preventLeak';
import {setWebRTCState} from './webrtc/setWebRTCState';
import {WebRTCState} from './webrtc/state';
import {via} from './components/via';
import {configureSplitTunneling} from './components/configureSplitTunneling';
import {getBypassList} from './vpn/getBypassList';
import {storedSplitTunneling} from './vpn/storedSplitTunneling';
import {warn} from './log/log';
import {storedNotificationsEnabled} from './notifications/notificationsEnabled';
import {canAccessPaidServers} from './account/user/canAccessPaidServers';
import {RefreshTokenError} from './account/RefreshTokenError';
import {requireUser} from './account/requireUser';
import {getPmUserFromPopup} from './account/user/getPmUserFromPopup';
import {pickServerInLogical} from './vpn/pickServerInLogical';
import {milliSeconds} from './tools/milliSeconds';
import {appendUrlParams} from './tools/appendUrlParams';
import {crashReportOptIn, getCrashReportOptIn, handleError} from './tools/sentry';
import {connectEventHandler} from './tools/connectEventHandler';
import {getPrefillValues} from './tools/prefill';
import {ServerRotator} from './vpn/ServerRotator';
import {configureGoToButtons} from './components/goToButton';
import {updateAccessSentenceWithCounts} from './components/accessSentence';
import {configureLinks, setNewTabLinkTitle} from './components/links';
import {configureModalButtons} from './components/modals/modals';
import {configureRatingModalButtons, maybeShowRatingModal} from './components/modals/ratingModal';
import {setReviewInfoStateOnConnectAction} from './vpn/reviewInfo';

const state = {
	connected: false,
	restarted: false,
};

type Theme = 'dark' | 'light' | 'auto';

const start = async () => {
	await fetchTranslations();

	const spinner = document.getElementById('spinner');
	const loggedView = document.getElementById('logged-view');

	if (!chrome.proxy) {
		showSigningView(document.getElementById('sign-in-view'), loggedView, spinner, false);

		return;
	}

	const proxySupported: boolean = await new Promise(resolve => {
		chrome.permissions.contains(proxyPermission, (ok) => {
			if (!ok) {
				showSigningView(document.getElementById('sign-in-view'), loggedView, spinner, false);
			}

			resolve(ok);
		});
	});

	hideIf({
		'.secure-core-action-block': !secureCoreEnabled,
		'.secure-core-container': !(secureCoreEnabled && secureCoreQuickButtonEnabled),
		'.split-tunneling-action-block': !splitTunnelingEnabled,
		'.auto-connect-action-block': !autoConnectEnabled,
	});

	let theme: Theme = 'dark';

	const setTheme = (theme: Theme) => {
		const themes = ['dark', 'light', 'auto'];

		themes.forEach(choice => {
			document.querySelectorAll<HTMLInputElement>('[name="theme"][value="' + choice + '"]').forEach(input => {
				input.checked = (choice === theme);
			});
		});

		if (!document.body.classList.contains(theme + '-theme')) {
			themes.forEach(choice => {
				document.body.classList[choice === theme ? 'add' : 'remove'](choice + '-theme');
			});
		}
	};

	const storedTheme = storage.item<{value: Theme}>('theme');
	storedTheme.get().then(themeCache => {
		theme = themeCache?.value || theme;
		setTheme(theme);
	});

	const session = await readSession();

	if (!session.uid || !session.refreshToken) {
		try {
			if (!await startSession(session)) {
				return;
			}
		} catch (e) {
			warn(e);
		}
	}

	const modalErrorSlot = document.getElementById('modal-error') as HTMLDivElement;

	modalErrorSlot.querySelector('.close-button')?.addEventListener('click', () => {
		const id = modalErrorSlot.getAttribute('data-error-id');
		const restartOnClose = Number(modalErrorSlot.getAttribute('data-error-restart-on-close'));

		if (id) {
			triggerPromise(storage.setItem('closed-' + id, {value: 1}));
		}

		modalErrorSlot.style.display = 'none';

		if (restartOnClose) {
			showSigningView(document.getElementById('sign-in-view'), loggedView, spinner, proxySupported);
		}
	});

	const errorSlot = document.querySelector('.error-slot') as HTMLDivElement;

	let currentRegionState: {name: string, content: string} | undefined = undefined;

	const setRegionPage = (name: string, content: string) => {
		currentRegionState = {name, content};

		const nameSlot = document.querySelector<HTMLDivElement>('[data-page="region"] .page-title .name');
		const regionSlot = document.querySelector<HTMLDivElement>('[data-page="region"] .region-content');

		if (nameSlot) {
			nameSlot.innerHTML = name;
		}

		if (regionSlot && content) {
			regionSlot.innerHTML = content;
			configureButtons(regionSlot);
			configureGoToButtons(regionSlot, goTo);
			configureServerGroups(regionSlot);
			showConnectedItemMarker(regionSlot);
		}
	};

	const goToRegion = (name: string, content: string) => {
		if (currentRegionState) {
			backStates.push(currentRegionState);
		}

		setRegionPage(name, content);

		goTo('region');
	};

	const onClick = (element: HTMLElement, callback: (event: MouseEvent | KeyboardEvent) => void) => {
		element.addEventListener('click', callback);
		element.addEventListener('keydown', event => {
			if (element === document.activeElement && (event.key === 'Enter' || event.key === ' ')) {
				callback(event);
			}
		});
	};

	const filterLogicalsWithCurrentFeatures = (rawLogicals: Logical[], userTier: number, withTor = false) => rawLogicals.filter(
		logicial => (logicial.Features & ((withTor ? 0 : Feature.TOR) | Feature.RESTRICTED | Feature.PARTNER)) === 0 &&
			(logicial.Features & Feature.SECURE_CORE) === (userTier > 0 && secureCore?.value ? Feature.SECURE_CORE : 0)
	);

	const excludeLogicalsFromCurrentCountry = (rawLogicals: Logical[], /** e.g. JP | US */exitCountry?: Logical["ExitCountry"]) =>
		rawLogicals.filter(logical => logical.ExitCountry !== exitCountry);

	const getLogicalFromButton = (button: HTMLButtonElement): {
		getLogical: () => Logical | null | undefined,
		choice: Omit<Choice, 'connected'>,
	} => {
		const id = button.getAttribute('data-id');

		if (id) {
			return {
				getLogical: () => getLogicalById(id),
				choice: {logicalId: id},
			};
		}

		const exitCountry = button.getAttribute('data-exitCountry') || '';

		if (exitCountry) {
			const logicals = getAllLogicals(countries[exitCountry]);
			const subGroup = button.getAttribute('data-subGroup') || '';

			if (subGroup) {
				switch (subGroup.toLowerCase()) {
					case 'other':
						return {
							getLogical: () => requireBestLogical(filterLogicalsWithCurrentFeatures(logicals.filter(
								logical => (logical.Features & Feature.TOR) === 0 && !logical.City && logical.Tier > 0,
							), userTier), userTier, setError),
							choice: {
								exitCountry: exitCountry,
								filter: 'other',
							},
						};

					case 'tor':
						return {
							getLogical: () => requireBestLogical(filterLogicalsWithCurrentFeatures(logicals.filter(
								logical => logical.Features & Feature.TOR,
							), userTier, true), userTier, setError),
							choice: {
								exitCountry: exitCountry,
								requiredFeatures: Feature.TOR,
							},
						};

					case 'free':
						return {
							getLogical: () => requireBestLogical(filterLogicalsWithCurrentFeatures(logicals.filter(
								logical => logical.Tier < 1,
							), userTier), userTier, setError),
							choice: {
								exitCountry: exitCountry,
								tier: 0,
							},
						};

					default:
						return {
							getLogical: () => requireBestLogical(filterLogicalsWithCurrentFeatures(logicals.filter(
								logical => logical.City === subGroup,
							), userTier), userTier, setError),
							choice: {
								exitCountry: exitCountry,
								city: subGroup,
							},
						};
				}
			}

			const entryCountry = button.getAttribute('data-entryCountry') || '';

			if (entryCountry) {
				return {
					getLogical: () => requireBestLogical(filterLogicalsWithCurrentFeatures(logicals.filter(
						logical => logical.EntryCountry === entryCountry,
					), userTier), userTier, setError),
					choice: {
						exitCountry: exitCountry,
						entryCountry: entryCountry,
					},
				};
			}

			return {
				getLogical: () => requireBestLogical(filterLogicalsWithCurrentFeatures(logicals, userTier), userTier, setError),
				choice: {exitCountry: exitCountry},
			};
		}

		return {
			getLogical: () => null,
			choice: {},
		};
	};

	let pmUserCache: {user: PmUser | undefined} | null = null;

	const getPmUser = async () => {
		if (pmUserCache) {
			return pmUserCache.user;
		}

		const user = await getPmUserFromPopup();

		pmUserCache = {user};

		return user;
	};

	const appendUpgradeParams = async (url: string) => {
		const pmUser = await getPmUser();

		return appendUrlParams(url, {
			email: pmUser?.Email,
			// Preselect VPN Plus plan if the user has no plan
			// The user might have a plan without VPN entitlement
			// In such case we don't select a plan and let user choose
			plan: user?.Subscribed ? '' : 'vpn2024',
		});
	};

	const configureButtons = (area?: HTMLDivElement) => {
		(area || document).querySelectorAll<HTMLButtonElement>('.expand-button:not(.expand-button-configured)').forEach(button => {
			button.classList.add('expand-button-configured');

			let parent = button.parentNode as HTMLDivElement;
			const max = area || document.body;

			while (parent !== max && !parent?.classList?.contains('country-header') && !parent?.classList?.contains('server-type')) {
				parent = parent.parentNode as HTMLDivElement;
			}

			if (parent !== max) {
				button.addEventListener('mouseover', () => {
					parent.classList.add('hover');
				});

				button.addEventListener('mouseout', () => {
					parent.classList.remove('hover');
				});
			}

			onClick(button, async (event) => {
				event.stopPropagation();
				event.stopImmediatePropagation?.();
				event.preventDefault();

				const id = button.getAttribute('data-expand');
				const {choice} = getLogicalFromButton(button);
				const code = `${choice.exitCountry}`;
				const expandContent = (id && ((window as any).sectionBuilder?.[id]?.() || document.getElementById(id)?.innerHTML)) || '';

				goToRegion(
					`
						<div class="country-flag">
							${secureCore?.value ? via() : ''}
							${getCountryFlag(code)}
						</div>
						<div class="country-name" data-country-code="${code}">
							${button.getAttribute('data-subGroupName') || getCountryNameOrCode(code)}
						</div>
					`,
					expandContent,
				);
			});
		});

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

			const forget = !!(button.classList.contains('upgrade-button') || Number(button.getAttribute('data-forget-account')));
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
				const page = document.querySelector<HTMLDivElement>('[data-page="upgrade"]');

				if (page) {
					page.querySelectorAll('.open-upgrade-page').forEach(button => {
						button.setAttribute('data-href', href);
						button.setAttribute('data-direct-upgrade', '1');
					});
					configureButtons(page);
					const url = await appendUpgradeParams(href);
					page.querySelectorAll('.open-upgrade-page').forEach(button => {
						button.setAttribute('data-href', url);
						button.removeAttribute('data-direct-upgrade');
					});
					configureButtons(page);

					updateAccessSentenceWithCounts(page);
				}

				return;
			}

			handleLeavingAction(href, forget);
		};

		(area || document.getElementById('servers') || document).querySelectorAll<HTMLButtonElement>('.open-upgrade-page, button:not(.close-button):not(.corner-button):not(.quick-connect-button), .connect-clickable, .server:not(.in-maintenance)').forEach(button => {
			onClick(button, async (event) => {
				event.stopPropagation();
				event.stopImmediatePropagation?.();
				event.preventDefault();

				const href = button.getAttribute('data-href');

				if (href) {
					triggerPromise(triggerLinkButton(href, button));

					return;
				}

				const {getLogical, choice} = getLogicalFromButton(button);
				const logical = getLogical?.();

				if (!logical) {
					throw new Error('Misconfigured server. Cannot find the selected logical.');
				}

				setLastChoiceWithCurrentOptions({
					connected: true,
					...choice,
				});
				goTo('world');
				await connectToServer(logical);
			});
		});

		configureLinks(area || document, triggerLinkButton);
		configureGoToButtons(area || document, goTo);
	};

	const setError = (apiError: ApiError | Error | ErrorDump | undefined) => {
		handleError(apiError);

		const id = (apiError as ApiError)?._id;
		(async () => {
			return Object.assign(
				{blockingError: '', error: '', restartOnClose: false},
				apiError && !(id && (await storage.getItem<{value: number}>('closed-' + id))?.value)
					? getErrorMessage(apiError)
					: {}
			);
		})().then(({blockingError, error, restartOnClose}) => {
			modalErrorSlot.setAttribute('data-error-restart-on-close', restartOnClose ? '1' : '0');
			modalErrorSlot.style.display = blockingError ? 'flex' : 'none';

			if (id) {
				modalErrorSlot.setAttribute('data-error-id', id);
			}

			(modalErrorSlot.querySelector('.modal-error-slot') as HTMLDivElement).innerHTML = blockingError;
			errorSlot.innerHTML = error;
			errorSlot.querySelectorAll('.close-button').forEach(button => {
				button.addEventListener('click', () => {
					if (id) {
						triggerPromise(storage.setItem('closed-' + id, {value: 1}));
					}

					const block = button.parentNode as HTMLDivElement;
					block.parentNode?.removeChild(block);

					if (restartOnClose) {
						showSigningView(document.getElementById('sign-in-view'), loggedView, spinner, proxySupported);
					}
				});
			});
			configureButtons(errorSlot);
			configureButtons(modalErrorSlot);
		});
	};

	let user: User | undefined;

	try {
		user = await requireUser();
	} catch (e) {
		if (e instanceof RefreshTokenError ||
			(e as RefreshTokenError).logout ||
			(!state.restarted && isUnauthorizedError(e))
		) {
			state.restarted = true;
			await saveSession({});

			triggerPromise(start());

			return;
		}

		if (spinner) {
			spinner.style.display = 'none';
		}

		if (loggedView) {
			loggedView.style.display = 'block';
		}

		setError(e as ApiError);

		user = undefined;
	}

	if (!user) {
		return;
	}

	const storedSecureCore = storage.item<{value: boolean}>('secure-core');
	const storedAutoConnect = storage.item<{value: boolean}>('auto-connect');
	let logicals: Logical[] = [];
	const [
		logicalsInput,
		cities,
		secureCore,
		notificationsEnabled,
		autoConnect,
		preventWebrtcLeak,
		telemetryEnabled,
		telemetry,
		crashReportEnabled,
		splitTunneling,
	] = await Promise.all([
		getSortedLogicals(),
		getCities(session.uid),
		secureCoreEnabled
			? storedSecureCore.getDefined({value: false})
			: new Promise<{value: boolean}>((resolve) => {
				resolve({value: false});
			}),
		storedNotificationsEnabled.getDefined({value: true}),
		autoConnectEnabled
			? storedAutoConnect.getDefined({value: true})
			: new Promise<{value: boolean}>((resolve) => {
				resolve({value: false});
			}),
		storedPreventWebrtcLeak.getDefined({value: true}),
		isTelemetryFeatureEnabled(),
		getTelemetryOptIn(),
		getCrashReportOptIn(),
		storedSplitTunneling.getDefined({value: []}),
	]);
	logicals = logicalsInput;

	if (!telemetryEnabled) {
		document.querySelectorAll<HTMLDivElement>('.telemetry-block').forEach(block => {
			block.style.display = 'none';
		});
	}

	mergeTranslations(logicals, cities);

	window.addEventListener('languagechange', async () => {
		const cities = await getCities((await readSession()).uid);
		mergeTranslations(logicals, cities);

		each(countries, (countryCode, countryItem) => {
			countryItem.name = getCountryNameOrCode(countryCode);
		});

		document.querySelectorAll<HTMLSpanElement>('.city-name').forEach(city => {
			const englishName = city.getAttribute('data-english-city-name');
			const countryCode = city.getAttribute('data-country-code');

			if (!englishName || !countryCode) {
				return;
			}

			city.innerHTML = escapeHtml(
				(cities[countryCode] || {})[englishName] || englishName,
			);
		});

		document.querySelectorAll<HTMLSpanElement>('.country-name').forEach(country => {
			const code = `${country.getAttribute('data-country-code')}`;
			country.innerHTML = escapeHtml(getCountryNameOrCode(code));
		});
	});

	const userTier = getUserMaxTier(user);

	/** `MaxTier 2` */
	const hasAccessToPaidServers = canAccessPaidServers(user);

	/** `MaxTier 0` */
	const isFreeTier = !hasAccessToPaidServers;

	const browserExtensionEnabled = user?.VPN?.BrowserExtension || false;
	const limitedUi = !browserExtensionEnabled;

	const connectionState = await (async () => {
		try {
			return await timeoutAfter(
				getInfoFromBackground(BackgroundData.STATE),
				milliSeconds.fromSeconds(5),
				'Unable to load state',
			);
		} catch (error) {
			warn(error, new Error().stack);

			return {error} as ConnectionState['data'];
		}
	})();
	state.connected = !!connectionState?.server;
	(limitedUi ? upsell(user?.VPN?.BrowserExtensionPlan || 'VPN Plus') : new Promise<ApiError | Error | ErrorDump | undefined>(resolve => {
		resolve(connectionState.error);
	})).then(error => {
		setError(error);
	});

	const countries: CountryList = {};
	const freeCountries = {} as Record<string, true>;

	logicals.forEach(logical => {
		// Don't bother paid users with free servers
		if (hasAccessToPaidServers && logical.Tier === 0) {
			return;
		}

		const country = logical.ExitCountry;

		if (logical.Tier <= 0) {
			freeCountries[country] = true;
		}

		logical.EntryCountryName = getCountryName(logical.EntryCountry, 'en');
		logical.Translations || (logical.Translations = {});
		logical.Translations.EntryCountryName = getCountryName(logical.EntryCountry);
		const isSecureCore = logical.Features & Feature.SECURE_CORE;
		const groupType = isSecureCore
			? 'secureCore'
			: (logical.City
				? 'city'
				: ((logical.Features & Feature.TOR)
					? 'tor'
					: (logical.Tier < 1 ? 'free' : 'other')
				)
			);
		const groupEnglishName = (!isSecureCore && logical.City) || ucfirst(groupType);
		const groupName = isSecureCore
			? c('Info').t`Secure Core`
			: (logical.Translations?.City
				|| logical.City
				|| ({
					tor: 'TOR',
					free: /* translator: it's for free servers that can be accessed without paid subscription */ c('Label').t`Free`,
				} as Record<typeof groupType, string>)[groupType]
				|| /* translator: server fallback type */ c('Label').t`Other`
			);

		const infos = countries[country] || (countries[country] = {
			englishName: getCountryNameOrCode(country, 'en'),
			name: getCountryNameOrCode(country),
			needUpgrade: true,
			groups: {},
		});
		infos.groups || (infos.groups = {});

		infos.needUpgrade = infos.needUpgrade && (userTier < logical.Tier);

		const group = infos.groups[groupEnglishName] || (infos.groups[groupEnglishName] = {
			type: groupType,
			englishName: groupEnglishName,
			name: groupName,
			needUpgrade: true,
			logicals: [],
		});
		group.needUpgrade = group.needUpgrade && (userTier < logical.Tier);
		(group.logicals || (group.logicals = [])).push(logical);
	});

	const servers = document.querySelector('#servers') as HTMLDivElement;

	if (!proxySupported) {
		return;
	}

	if (spinner) {
		spinner.style.display = 'none';
	}

	if (loggedView) {
		loggedView.style.display = 'block';
	}

	servers.classList[limitedUi ? 'add' : 'remove']('not-allowed-by-plan');

	let refresh = () => {
		servers.innerHTML = countryList(countries, userTier, secureCore);
		configureServerGroups();
	};
	refresh();

	const setLastChoiceWithCurrentOptions = (choice: Choice) => {
		const options = {
			excludedFeatures: 0,
			requiredFeatures: 0,
		};

		const features = {
			[Feature.SECURE_CORE]: secureCore?.value,
		};

		each(features, (feature, toggled) => {
			const key = toggled ? 'requiredFeatures' : 'excludedFeatures';
			options[key] = options[key] | Number(feature);
		});

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

	// Load unique DOM elements
	const serverStatusSlot = document.querySelector('#status .connection-status') as HTMLDivElement;
	const signOutButton = document.querySelector('button.sign-out-button') as HTMLDivElement;
	const switchButton = document.querySelector('button.switch-account-button') as HTMLDivElement;
	const menu = document.getElementById('menu') as HTMLDivElement;
	const quickConnectButton = document.querySelector('.quick-connect-button') as HTMLDivElement;
	const disconnectButton = document.querySelector('#status button.disconnection-button') as HTMLDivElement;

	const freeCountriesListEl = document.getElementById('free-countries-list') as HTMLDivElement;
	const freeCountriesCountEl = document.getElementById('free-server-countries-count') as HTMLSpanElement;
	const freeCountryItemTemplate = document.getElementById('free-country-item-template') as HTMLTemplateElement;

	disconnectButton.innerHTML = c('Action').t`Disconnect`;

	const disconnect = async (type: StateChange = StateChange.DISCONNECT) => {
		const previousServer = connectionState?.server;
		const previousLogical = previousServer?.id ? getLogicalById(previousServer.id) : undefined;

		state.connected = false;
		refreshConnectionStatus();
		setLastChoiceWithCurrentOptions({connected: false});

		connectEventHandler.disconnect(previousLogical, previousServer);

		await sendMessageToBackground(type);
	};

	disconnectButton.addEventListener('click', async () => {
		await disconnect();
	});

	const showConnectedItemMarker = (area?: HTMLElement, connected?: boolean) => {
		if (typeof connected === 'undefined') {
			connected = state.connected;
		}

		const exitCountry = connectionState?.server?.exitCountry;
		const exitEnglishCity = connectionState?.server?.exitEnglishCity;
		const id = connectionState?.server?.id;

		(area || document).querySelectorAll<HTMLDivElement>('.country-name').forEach(nameSlot => {
			const currentCode = nameSlot.getAttribute('data-country-code');

			nameSlot.classList[connected && currentCode && currentCode === exitCountry
				? 'add'
				: 'remove'
				]('connected-list-item');
		});

		(area || document).querySelectorAll<HTMLDivElement>('.group-button').forEach(groupSlot => {
			const subGroup = groupSlot.getAttribute('data-subGroup');
			const groupExitCountry = groupSlot.getAttribute('data-exitCountry');
			const match = connected && subGroup && groupExitCountry && subGroup === exitEnglishCity && groupExitCountry === exitCountry;

			groupSlot.querySelectorAll<HTMLDivElement>('.group-name').forEach(nameSlot => {
				nameSlot.classList[match ? 'add' : 'remove']('connected-list-item');
			});
		});

		(area || document).querySelectorAll<HTMLDivElement>('.server-name').forEach(nameSlot => {
			nameSlot.classList[connected && id && nameSlot.getAttribute('data-server-id') === id
				? 'add'
				: 'remove'
				]('connected-list-item');
		});
	};

	const showFreeQuickConnect = simplifiedUi && isFreeTier;


	let connectionAttemptTime = 0;
	let connectingChecker: ReturnType<typeof setInterval> | undefined = undefined;

	const serverChangeRemainingTimeView = document.querySelector<HTMLDivElement>('[data-page="server-change-remaining-time"]')!;

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

	const refreshConnectionStatus = (server?: ServerSummary, connecting = false) => {
		server || (server = connectionState?.server);
		const exitCountry = server?.exitCountry || '';
		const entryCountry = server?.entryCountry || '';
		const secureCore = !!(entryCountry && entryCountry !== exitCountry);
		const exitCity = server?.exitCity || '';
		const name = exitCity + ' ' + (server?.name || '').replace(new RegExp('^' + exitCountry + '#'), '#');
		const exitIp = server?.exitIp || '';
		const canDisconnectOrCancel = (state.connected || connecting);
		disconnectButton.style.display = canDisconnectOrCancel ? 'block' : 'none';
		quickConnectButton.style.display = canDisconnectOrCancel && hasAccessToPaidServers ? 'none' : 'block';
		quickConnectButton.innerHTML = canDisconnectOrCancel ? c('Action').t`Change server` : c('Action').t`Connect`;
		quickConnectButton.classList[canDisconnectOrCancel ? 'add' : 'remove']('weak');
		document.querySelectorAll<HTMLDivElement>('.quick-connect-button-subtitle').forEach(quickConnectSubtitle => {
			if (hasAccessToPaidServers) {
				return;
			}

			quickConnectSubtitle.style.display = canDisconnectOrCancel ? 'none' : 'block';
		});
		document.querySelectorAll<HTMLDivElement>('.quick-connect-button-incentive').forEach(quickConnectIncentive => {
			quickConnectIncentive.style.display = canDisconnectOrCancel ? 'none' : 'block';
		});
		logo.switchTo(canDisconnectOrCancel ? 'protected' : 'unprotected');
		showConnectedItemMarker(servers, state.connected && !connecting);

		serverRotator?.refreshState(canDisconnectOrCancel);

		if (connecting) {
			connectionAttemptTime = Date.now();
			connectingChecker = setInterval(() => {
				sendMessageToBackground(StateChange.CONNECTING, {connectionAttemptTime});
			}, 500);
			disconnectButton.classList.remove('danger-hover');
			disconnectButton.innerHTML = c('Action').t`Cancel`;
			serverStatusSlot.classList.remove('success', 'danger');
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

		disconnectButton.innerHTML = c('Action').t`Disconnect`;
		disconnectButton.classList.add('danger-hover');
		serverStatusSlot.classList.remove(state.connected ? 'danger' : 'success');
		serverStatusSlot.classList.add(state.connected ? 'success' : 'danger');

		const baseCountries = ['US', 'NL', 'JP'];
		const freeCountriesList = [
			...baseCountries.filter(country => freeCountries[country]),
			...Object.keys(freeCountries).filter(country => baseCountries.indexOf(country) === -1),
		];

		const getCountryFlagGroup = (countries: string[]): string => {
			return countries.map((country, index) => `
				<span class="country-in-group${country !== countries[0] ? ' folded' : ''}" style="z-index: ${3 - index}">${
					getCountryFlag(country)
				}</span>`).join('');
		};

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
						(secureCore ? `${getCountryFlag(entryCountry)} &nbsp;${via()}&nbsp;` : '') +
						getCountryFlag(exitCountry)
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

				${'' /*<div class="incentive">${c('Label').t`Protect yourself online`}</div>*/}
				${showFreeQuickConnect && browserExtensionEnabled ? `
				<div class="current-server-description">
					<div class="lightning">
						<svg class="lightning-symbol" viewBox="0 0 10 14">
							<use xlink:href="img/icons.svg#lightning"></use>
						</svg>
					</div>
					<div class="fastest-server" data-go-to="about-free-connections">
						<div class="current-server-country">${c('Info').t`Fastest free server`}</div>
						<div class="current-server-name">
							<span class="auto-select-label">${c('Info').t`Auto-selected from`}</span>
							<span>
							${freeCountriesList.length <= 3
								? getCountryFlagGroup(freeCountriesList)
								: getCountryFlagGroup(freeCountriesList.slice(0, 3)) + ' +' + (freeCountriesList.length - 3)}
							</span>
						</div>
					</div>
				</div>
				` : ''}
			`;

		configureButtons(serverStatusSlot);

		if (isFreeTier && freeCountriesListEl && freeCountryItemTemplate && freeCountriesCountEl) {
			// Clear the list
			let node = freeCountryItemTemplate.nextSibling;
			while (node) {
				const next = (node as any).nextElementSibling;
				freeCountriesListEl.removeChild(node);
				node = next;
			}

			// Fill the list with free countries
			Object.keys(freeCountries).forEach(countryCode => {
				const clone = freeCountryItemTemplate.content.firstElementChild?.cloneNode(true) as HTMLElement;
				if (clone) {
					const flagImg = clone.querySelector('.country-flag-img') as HTMLImageElement;
					const nameDiv = clone.querySelector('.country-name') as HTMLDivElement;
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

			freeCountriesCountEl.textContent = Object.keys(freeCountries).length.toString();
		}

		triggerPromise(refreshLocationSlots(true));
	};

	triggerPromise(showNotifications());


	getInfoFromBackground(BackgroundData.PM_USER).then(pmUser => {
		pmUserCache = {user: pmUser};
		const name = escapeHtml(pmUser.DisplayName || pmUser.Name || pmUser.Email || '');

		document.querySelectorAll<HTMLDivElement>('.pm-user-name').forEach((userName) => {
			userName.innerHTML = name;
		});
	});

	const plan = escapeHtml(
		user.VPN.PlanTitle || /* translator: plan title for free users */ c('Label').t`Free`,
	);

	document.querySelectorAll<HTMLDivElement>('.pm-plan').forEach((planName) => {
		planName.innerHTML = plan;
	});

	document.querySelectorAll<HTMLDivElement>('[data-open-account-page]').forEach((button) => {
		setNewTabLinkTitle(button);
		button.addEventListener('click', async () => {
			const url = accountURL + button.getAttribute('data-open-account-page');

			await openTab(await appendUpgradeParams(url));
			forgetAccount();
		});
	});

	document.querySelectorAll<HTMLInputElement>('.theme-choice input').forEach(input => {
		input.addEventListener('change', async () => {
			if (input.checked) {
				const value = input.value as Theme;
				setTheme(value);
				await storedTheme.set({value});
			}
		});
	});

	const connectToServer = async (logical: Logical) => {
		connectEventHandler.connect(logical);

		const server = pickServerInLogical(logical);

		if (!server) {
			throw new Error('Misconfigured server. Cannot find an entry for this server.');
		}

		try {
			const willHaveToConnect = !state.connected;
			state.connected = true;
			refreshConnectionStatus({
				id: logical.ID,
				name: logical.Name,
				exitIp: server.ExitIP,
				entryCountry: logical.EntryCountry,
				exitCountry: logical.ExitCountry,
				exitCity: logical.Translations?.City || logical.City,
				exitEnglishCity: logical.City,
				secureCore: ((logical.Features & Feature.SECURE_CORE) !== 0),
			}, willHaveToConnect);
			await sendMessageToBackground(StateChange.CONNECT, {
				server,
				logical,
				user,
				bypassList: getBypassList(userTier, splitTunneling.value),
			});
			await setReviewInfoStateOnConnectAction();
			maybeShowRatingModal(user);
		} catch (e) {
			setError(e as Error);
		}
	};

	const closeSession = async (action: StateChange) => {
		if (state.connected) {
			const mainArea = document.querySelector<HTMLDivElement>('.main-area');

			if (mainArea) {
				const confirmModal = document.createElement('div');
				confirmModal.classList.add('confirm-modal');
				confirmModal.innerHTML = `<div>
					${
						c('Confirm').t`Logging out of the application will disconnect the active VPN connection. Do you want to continue?`
					}
					<div class="user-buttons-bar">
						<button data-st-action="cancel" class="tertiary-button" data-trans data-context="Action">Cancel</button>
						<button data-st-action="ok" class="primary-button" data-trans data-context="Action">OK</button>
					</div>
				</div>`;
				mainArea.appendChild(confirmModal);

				confirmModal.querySelectorAll<HTMLButtonElement>('[data-st-action="cancel"]').forEach(button => {
					button.addEventListener('click', () => {
						mainArea.removeChild(confirmModal);
					});
				});
				confirmModal.querySelectorAll<HTMLButtonElement>('[data-st-action="ok"]').forEach(button => {
					button.addEventListener('click', async () => {
						confirmModal.querySelectorAll<HTMLButtonElement>('[data-st-action]').forEach(otherButton => {
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
	quickConnectButton.innerHTML = limitedUi
		? c('Action').t`Upgrade`
		: (showFreeQuickConnect ? c('Action').t`Connect` : c('Action').t`Quick connect`);
	quickConnectButton.addEventListener('click', async () => {
		if (isFreeTier && state.connected) {
			if (await serverRotator!.isPending()) {
				serverRotator!.showModal();

				return;
			}

			errorSlot.innerHTML = '';

			const alienLogicals = excludeLogicalsFromCurrentCountry(logicals, connectionState?.server?.exitCountry);
			const filteredLogicals = filterLogicalsWithCurrentFeatures(alienLogicals, userTier);
			const logical = requireRandomLogical(filteredLogicals, userTier, setError);
			setLastChoice({
				connected: true,
				pick: 'random',
			});

			await connectToServer(logical);

			await serverRotator!.startCountdown();

			return;
		}

		if (limitedUi) {
			await openTab(appendUrlParams(manageAccountURL, {email: (await getPmUser())?.Email}));
			forgetAccount();

			return;
		}

		errorSlot.innerHTML = '';
		const logical = requireBestLogical(filterLogicalsWithCurrentFeatures(logicals, userTier), userTier, setError);
		setLastChoice({
			connected: true,
			pick: 'fastest',
		});

		await connectToServer(logical);
	});

	(document.querySelector('#status') as HTMLDivElement).style.display = 'block';
	refreshConnectionStatus();

	['aria-label', 'title'].forEach(attribute => {
		document.querySelectorAll('[' + attribute + ']').forEach(button => {
			button.setAttribute(attribute, getTranslation(
				button.getAttribute('data-context') || 'Info',
				([value]) => value,
				[button.getAttribute(attribute) as string],
			));
		});
	});

	translateArea(document);

	const backStates: ({name: string, content: string})[] = [];

	document.querySelectorAll('[data-page="region"] .page-title .back-button').forEach(button => {
		button.addEventListener('click', () => {
			const backState = backStates.pop();

			if (!backState) {
				goTo('world');

				return;
			}

			const {name, content} = backState;

			setRegionPage(name, content);
		});
	});

	function goTo(page: string): void {
		if (page !== 'region') {
			currentRegionState = undefined;

			if (backStates.length) {
				backStates.splice(0, backStates.length);
			}
		}

		const zone = (page && ({
			// parent for each sub-page
			region: 'world',
			'split-tunneling': 'features',
		})[page]) || page;

		document.querySelectorAll('[data-go-to]').forEach(b => {
			b.classList[b.getAttribute('data-go-to') === zone ? 'add' : 'remove']('active');
			b.removeAttribute('aria-current');
		});

		if (page) {
			document.querySelectorAll<HTMLDivElement>('[data-page]').forEach(pageBlock => {
				const isActivePage = pageBlock.getAttribute('data-page') === page;
				pageBlock.classList[isActivePage ? 'add' : 'remove']('selected-page');

				if (isActivePage) {
					configureButtons(pageBlock);
					configureGoToButtons(pageBlock, goTo);
				}
			});
		}

		document.querySelectorAll('.page-view, .page-view [data-page]').forEach(pageBlock => {
			pageBlock.scrollTop = 0;
		});

		if (loggedView) {
			loggedView.scrollTop = 0;
		}
	};

	configureGoToButtons(document, goTo);

	const centralView = document.querySelector<HTMLDivElement>('.central-view');

	if (centralView) {
		const minWidth = parseInt(window.getComputedStyle(centralView).minWidth);
		const maxWidth = screen.availWidth * 0.8;

		if (minWidth > maxWidth) {
			centralView.style.minWidth = Math.round(maxWidth) + 'px';
		}

		const minHeight = parseInt(window.getComputedStyle(centralView).minHeight);
		const maxHeight = screen.availHeight * 0.8;

		if (minHeight > maxHeight) {
			centralView.style.minHeight = Math.round(maxHeight) + 'px';
		}
	}

	const search = document.getElementById('search-input') as HTMLInputElement;

	if (search) {
		search.focus();
		search.onkeyup = e => {
			if (e.key === 'Enter' || e.keyCode === 13) {
				const firstButton = servers.querySelector<HTMLElement>('.server, .connect-option');

				if (firstButton) {
					firstButton.click();
				}
			}
		};
		let lastSearchStart = 0;
		refresh = setUpSearch(search, async searchText => {
			const searchStart = Date.now();
			lastSearchStart = searchStart;
			const searching = (searchText !== '');

			if (!servers.querySelector(':scope > .spinner')) {
				servers.innerHTML = `<div class="spinner">
					<div class="lds-ring"><div></div><div></div><div></div><div></div></div>
				</div>`;
			}

			// Wait a bit for consecutive letters typed
			await delay(searching ? 300 : 1);

			if (lastSearchStart !== searchStart) {
				return;
			}

			servers.innerHTML = searching
				? getSearchResult(countries, searchText, userTier, secureCore)
				: countryList(countries, userTier, secureCore) || `<p class="not-found">
					${c('Error').t`Unable to load the list`}<br />
					<small>${
						/* translator: maybe internet connection is unstable, wi-fi too far, or API domain got censored by the ISP or country */
						c('Error').t`Please check your connectivity`
					}</small>
				</p>`;
			configureButtons();
			configureServerGroups();
			showConnectedItemMarker();
		});

		toggleButtons(storedSecureCore, secureCore, {refresh, upgradeNeeded: isFreeTier});
		toggleButtons(storedNotificationsEnabled, notificationsEnabled);
		toggleButtons(storedAutoConnect, autoConnect);
		toggleButtons(telemetryOptIn, telemetry);
		toggleButtons(crashReportOptIn as any, crashReportEnabled, {buttonSelector: '.crash-button'});
		toggleButtons(storedPreventWebrtcLeak, preventWebrtcLeak, {refresh: async () => {
			await (state.connected
				? preventLeak()
				: setWebRTCState(WebRTCState.CLEAR)
			);
		}});
		configureSplitTunneling(storedSplitTunneling, splitTunneling, document, async () => {
			if (state.connected) {
				await sendMessageToBackground(SettingChange.BYPASS_LIST, getBypassList(userTier, splitTunneling.value));
			}
		}, userTier <= 0);
	}

	configureButtons();
	configureModalButtons();
	configureRatingModalButtons();

	watchBroadcastMessages({
		logicalUpdate(logicalsInput: Logical[]) {
			if (logicalsInput?.length) {
				logicals = logicalsInput;
			}
		},
		changeState(data: ChangeStateMessage['data']) {
			switch (data.state) {
				case 'connected':
					state.connected = true;
					connectionState.server = data.server;
					refreshConnectionStatus(data.server);
					setError(data.error);
					break;

				case 'connecting':
					state.connected = false;
					connectionState.server = data.server;
					refreshConnectionStatus(data.server, true);
					setError(data.error);
					break;

				case 'logged-out':
					showSigningView(document.getElementById('sign-in-view'), loggedView, spinner, proxySupported);
					break;

				case 'disconnected':
					state.connected = false;
					connectionState.server = undefined;
					refreshConnectionStatus(data.server);
					setError(data.error);
					break;
			}
		},
		error: setError,
	});

	const settingsPageTitle = document.querySelector('*[data-page="settings"] .page-title');

	settingsPageTitle?.addEventListener('dblclick', event => {
		const settingPage = document.querySelector('*[data-page="settings"]');

		if (!settingPage) {
			return;
		}

		const keyEvent = event as any;

		if (keyEvent.ctrlKey && keyEvent.altKey) {
			settingPage.classList.toggle('debug-mode');
		}
	});

	const maxTierInput = document.getElementById('max-tier') as HTMLInputElement|null;
	maxTierInput?.addEventListener('input', async () => {
		const oldValue = (global as any).logicalMaxTier || 2;
		const newValue = Number(maxTierInput.value);

		if (oldValue === newValue) {
			return;
		}

		(global as any).logicalMaxTier = newValue;
		await start();
	});

	maybeShowRatingModal(user);
};

triggerPromise(start());

window.addEventListener('message', (event: MessageEvent<string>) => {
	if (!event.origin.startsWith(accountURL)) {
		return;
	}

	if (event.data === 'endFork') {
		const accountFrame = document.getElementById('account-frame');

		if (accountFrame) {
			accountFrame.style.display = 'none';
		}

		document.querySelectorAll<HTMLDivElement>('.main-area').forEach(area => {
			area.style.display = 'block';
		});
	}
}, false);

window.addEventListener('unhandledrejection', handleError);
window.addEventListener('error', handleError);
