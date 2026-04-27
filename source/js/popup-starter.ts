// TODO: Remove this when VPNBEX-238 is done.
/* eslint-disable @typescript-eslint/no-use-before-define */
'use popup';
import type {Logical} from './vpn/Logical';
import {getLogicalById, getSortedLogicals, lookups} from './vpn/getLogicals';
import {readSession} from './account/readSession';
import {setDisplayStyle} from './tools/setDisplayStyle';
import {sendMessageToBackground} from './tools/sendMessageToBackground';
import {getInfoFromBackground} from './tools/getInfoFromBackground';
import {registerLocale} from './tools/locale';
import {reloadWindow} from './tools/reloadWindow';
import {stopEvent} from './tools/stopEvent';
import {createSession} from './account/createSession';
import {forgetUser} from './account/user/forgetUser';
import {forgetCredentials} from './account/credentials/removeCredentials';
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
import {type ApiError, ErrorActionCode, isUnauthorizedError} from './api';
import {saveSession} from './account/saveSession';
import type {User} from './account/user/User';
import type {PmUser} from './account/user/PmUser';
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
import {
	getAllLogicals,
	requireBestLogical,
	requireRandomLogical,
} from './vpn/getLogical';
import {getCities, mergeTranslations} from './vpn/getCities';
import {setUpSearch} from './search/setUpSearch';
import type {CountryList} from './components/countryList';
import {recentLocations} from './components/recentLocations';
import {aboutFreeConnections} from './components/aboutFreeConnections';
import {configureExpandButton} from './components/configureExpandButton';
import {configureRemoveRecentButton} from './components/configureRemoveRecentButton';
import {configureServerGroups} from './components/configureServerGroups';
import {configureLookupSearch} from './components/configureLookupSearch';
import {showConnectedItemMarker} from './components/showConnectedItemMarker';
import {storage} from './tools/storage';
import {showNotifications} from './notifications/showNotifications';
import {watchBroadcastMessages} from './tools/answering';
import type {ChangeStateMessage} from './tools/broadcastMessage';
import {getErrorMessage} from './tools/getErrorMessage';
import type {
	ConnectionState,
	ErrorDump,
	ServerSummary,
} from './vpn/ConnectionState';
import {Feature} from './vpn/Feature';
import {getCountryFlag} from './tools/getCountryFlag';
import {each} from './tools/each';
import {logo} from './tools/logo';
import {
	type Choice,
	forgetLastChoices,
	getLastChoices,
	setLastChoice,
} from './vpn/lastChoice';
import {ucfirst} from './tools/ucfirst';
import {toggleButtons} from './components/toggleButtons';
import {triggerPromise} from './tools/triggerPromise';
import {
	BackgroundAction,
	BackgroundData,
	SettingChange,
	StateChange,
} from './messaging/MessageType';
import {showSigningView} from './components/signIn/showSigningView';
import {delay, timeoutAfter} from './tools/delay';
import {proxyPermission} from './vpn/proxyPermission';
import {leaveWindowForTab, openTab} from './tools/openTab';
import {getSearchResult} from './search/getSearchResult';
import {upsell} from './tools/upsell';
import {forgetAccount} from './account/forgetAccount';
import {hideIf} from './tools/hideIf';
import {preventLeak} from './webrtc/preventLeak';
import {setWebRTCState} from './webrtc/setWebRTCState';
import {WebRTCState} from './webrtc/state';
import {via} from './components/via';
import {locationList} from './components/locationList';
import {configureSplitTunneling} from './components/configureSplitTunneling';
import {getSplitTunnelingConfig} from './vpn/getSplitTunnelingConfig';
import {
	loadAllFeatures,
	type LoadedFeature,
} from './vpn/features/loadAllFeatures';
import type {LocallyStoredFeature} from './vpn/features/LocallyStoredFeature';
import type {Toggle} from './vpn/features/Toggle';
import type {FeatureWrapper} from './vpn/features/FeatureWrapper';
import {warn} from './log/log';
import {canAccessPaidServers} from './account/user/canAccessPaidServers';
import {RefreshTokenError} from './account/RefreshTokenError';
import {requireUser} from './account/requireUser';
import {getRegisteredLocaleFromUser} from './account/user/getRegisteredLocaleFromUser';
import {getPmUserFromBackground} from './account/user/getPmUserFromBackground';
import {pickServerInLogical} from './vpn/pickServerInLogical';
import {milliSeconds} from './tools/milliSeconds';
import {appendUrlParams} from './tools/appendUrlParams';
import {handleError} from './tools/sentry';
import {connectEventHandler} from './tools/connectEventHandler';
import {getPrefillValues} from './tools/prefill';
import {toggleClass} from './tools/toggleClass';
import {updateLastActivityTime} from './tools/activity';
import {ServerRotator} from './vpn/ServerRotator';
import {configureGoToButtons} from './components/goToButton';
import {updateAccessSentenceWithCounts} from './components/accessSentence';
import {configureLinks, setNewTabLinkTitle} from './components/links';
import {configureModalButtons} from './components/modals/modals';
import {
	configureRatingModalButtons,
	maybeShowRatingModal,
} from './components/modals/ratingModal';
import {setReviewInfoStateOnConnectAction} from './vpn/reviewInfo';
import {filterLogicalsWithCurrentFeatures} from './vpn/filterLogicalsWithCurrentFeatures';
import {getActivityCheckInterval} from './intervals';
import {closeErrorModal} from './components/modals/closeErrorModal';

const state = {
	connected: false,
	restarted: false,
};

type Theme = 'dark' | 'light' | 'auto';

export const start = async (area: HTMLElement) => {
	let pmUserCache: {user: PmUser | undefined} | null = null;
	const session = await readSession();

	const getPmUser = async () => {
		if (pmUserCache) {
			return pmUserCache.user;
		}

		const user = await getPmUserFromBackground();

		pmUserCache = {user};

		return user;
	};

	if (session.uid) {
		try {
			registerLocale(getRegisteredLocaleFromUser(await getPmUser()));
		} catch {
			// Fallback to browser locale
		}
	}

	await fetchTranslations();

	const spinner = area.querySelector<HTMLElement>('#spinner');
	const loggedView = area.querySelector<HTMLElement>('#logged-view');

	if (!chrome.proxy) {
		showSigningView(
			area.querySelector('#sign-in-view'),
			loggedView,
			spinner,
			false,
		);

		return;
	}

	const proxySupported: boolean = await new Promise((resolve) => {
		chrome.permissions.contains(proxyPermission, (ok) => {
			if (!ok) {
				showSigningView(
					area.querySelector('#sign-in-view'),
					loggedView,
					spinner,
					false,
				);
			}

			resolve(ok);
		});
	});

	hideIf(area, {
		'.secure-core-action-block': !secureCoreEnabled,
		'.secure-core-container': !(
			secureCoreEnabled && secureCoreQuickButtonEnabled
		),
		'.split-tunneling-action-block': !splitTunnelingEnabled,
		'.auto-connect-action-block': !autoConnectEnabled,
	});

	let theme: Theme = 'dark';

	const setTheme = (theme: Theme) => {
		const themes = ['dark', 'light', 'auto'];

		themes.forEach((choice) => {
			area
				.querySelectorAll<HTMLInputElement>(
					'[name="theme"][value="' + choice + '"]',
				)
				.forEach((input) => {
					input.checked = choice === theme;
				});
		});

		if (!area.classList.contains(theme + '-theme')) {
			themes.forEach((choice) => {
				area.classList[choice === theme ? 'add' : 'remove'](choice + '-theme');
			});
		}
	};

	const storedTheme = storage.item<{value: Theme}>('theme');
	storedTheme.get().then((themeCache) => {
		theme = themeCache?.value || theme;
		setTheme(theme);
	});

	if (!session.uid || !session.refreshToken) {
		try {
			if (!(await createSession(area, session))) {
				return;
			}
		} catch (e) {
			warn(e);
		}
	}

	const errorModal = area.querySelector<HTMLDivElement>('#modal-error')!;

	errorModal.querySelector('.close-button')?.addEventListener('click', () => {
		triggerPromise(
			closeErrorModal(
				errorModal,
				undefined,
				area,
				loggedView,
				spinner,
				proxySupported,
			),
		);
	});

	const errorSlot = area.querySelector('.error-slot') as HTMLDivElement;

	let currentRegionState: {name: string; content: string} | undefined =
		undefined;

	const setRegionPage = (name: string, content: string) => {
		currentRegionState = {name, content};

		const nameSlot = area.querySelector<HTMLDivElement>(
			'[data-page="region"] .page-title .name',
		);
		const regionSlot = area.querySelector<HTMLDivElement>(
			'[data-page="region"] .region-content',
		);

		if (nameSlot) {
			nameSlot.innerHTML = name;
		}

		if (regionSlot && content) {
			regionSlot.innerHTML = content;
			configureArea(regionSlot);
		}
	};

	const goToRegion = (name: string, content: string) => {
		if (currentRegionState) {
			backStates.push(currentRegionState);
		}

		setRegionPage(name, content);

		goTo('region');
	};

	const onClick = (
		element: HTMLElement,
		callback: (event: MouseEvent | KeyboardEvent) => void,
	) => {
		element.addEventListener('click', callback);
		element.addEventListener('keydown', (event) => {
			if (
				element === document.activeElement &&
				(event.key === 'Enter' || event.key === ' ')
			) {
				callback(event);
			}
		});
	};

	const excludeLogicalsFromCurrentCountry = (
		rawLogicals: Logical[],
		/** e.g. 'JP' | 'US' */
		exitCountry?: Logical['ExitCountry'],
	) => rawLogicals.filter((logical) => logical.ExitCountry !== exitCountry);

	const getLogicalFromButton = (
		button: HTMLButtonElement,
	): {
		getLogical: () => Logical | null | undefined;
		choice: Omit<Choice, 'connected'>;
	} => {
		const id = button.getAttribute('data-id');

		if (id) {
			return {
				getLogical: () => getLogicalById(id),
				choice: {logicalId: id},
			};
		}

		const exitCountry = button.getAttribute('data-exitCountry') || '';
		const excludedFeatures = Number(
			button.getAttribute('data-excludedFeatures') || 0,
		);
		const requiredFeatures = Number(
			button.getAttribute('data-requiredFeatures') || 0,
		);
		const baseSecureCoreFilter = (() => {
			if (excludedFeatures & Feature.SECURE_CORE) {
				return {value: false};
			}

			if (requiredFeatures & Feature.SECURE_CORE) {
				return {value: true};
			}

			return undefined;
		})();

		if (exitCountry) {
			const logicals = getAllLogicals(countries[exitCountry]);
			const subGroup = button.getAttribute('data-subGroup') || '';
			const secureCoreFilter =
				baseSecureCoreFilter ??
				(button.hasAttribute('data-no-sc-filter')
					? undefined
					: features.secureCore.config);

			if (subGroup) {
				switch (subGroup.toLowerCase()) {
					case 'other':
						return {
							getLogical: () =>
								requireBestLogical(
									filterLogicalsWithCurrentFeatures(
										logicals.filter(
											(logical) =>
												(logical.Features & Feature.TOR) === 0 &&
												!logical.City &&
												logical.Tier > 0,
										),
										userTier,
										secureCoreFilter,
									),
									userTier,
									setError,
								),
							choice: {
								exitCountry: exitCountry,
								filter: 'other',
							},
						};

					case 'tor':
						return {
							getLogical: () =>
								requireBestLogical(
									filterLogicalsWithCurrentFeatures(
										logicals.filter(
											(logical) => logical.Features & Feature.TOR,
										),
										userTier,
										secureCoreFilter,
										true,
									),
									userTier,
									setError,
								),
							choice: {
								exitCountry: exitCountry,
								requiredFeatures: Feature.TOR,
							},
						};

					case 'free':
						return {
							getLogical: () =>
								requireBestLogical(
									filterLogicalsWithCurrentFeatures(
										logicals.filter((logical) => logical.Tier < 1),
										userTier,
										secureCoreFilter,
									),
									userTier,
									setError,
								),
							choice: {
								exitCountry: exitCountry,
								tier: 0,
							},
						};

					default:
						return {
							getLogical: () =>
								requireBestLogical(
									filterLogicalsWithCurrentFeatures(
										logicals.filter((logical) => logical.City === subGroup),
										userTier,
										secureCoreFilter,
									),
									userTier,
									setError,
								),
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
					getLogical: () =>
						requireBestLogical(
							filterLogicalsWithCurrentFeatures(
								logicals.filter(
									(logical) => logical.EntryCountry === entryCountry,
								),
								userTier,
								secureCoreFilter,
							),
							userTier,
							setError,
						),
					choice: {
						exitCountry: exitCountry,
						entryCountry: entryCountry,
					},
				};
			}

			return {
				getLogical: () =>
					requireBestLogical(
						filterLogicalsWithCurrentFeatures(
							logicals,
							userTier,
							secureCoreFilter,
						),
						userTier,
						setError,
					),
				choice: {exitCountry: exitCountry},
			};
		}

		const pick = button.getAttribute('data-pick') || '';

		// For now "closest" is not anywhere in the UI, it can redirect to "fastest"
		if (pick === 'fastest' || pick === 'closest') {
			return {
				getLogical: () =>
					requireBestLogical(
						filterLogicalsWithCurrentFeatures(
							logicals.filter((logical) => logical.Tier > 0),
							userTier,
							baseSecureCoreFilter,
						),
						userTier,
						setError,
					),
				choice: {pick},
			};
		}

		if (pick === 'random') {
			return {
				getLogical: () =>
					requireRandomLogical(
						filterLogicalsWithCurrentFeatures(
							logicals.filter((logical) => logical.Tier > 0),
							userTier,
							baseSecureCoreFilter,
						),
						userTier,
						setError,
					),
				choice: {pick},
			};
		}

		return {
			getLogical: () => null,
			choice: {},
		};
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

	let isSecureCoreEnabled = () => false;

	const configureButtons = (subArea?: HTMLElement) => {
		configureExpandButton(
			subArea || area,
			isSecureCoreEnabled,
			onClick,
			goToRegion,
			getLogicalFromButton,
		);
		configureRemoveRecentButton(subArea || area, onClick, () => {
			refresh();
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
					configureButtons(page);
					const url = await appendUpgradeParams(href);
					page.querySelectorAll('.open-upgrade-page').forEach((button) => {
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

					const {getLogical, choice} = getLogicalFromButton(button);
					const logical = getLogical?.();

					if (!logical) {
						throw new Error(
							'Misconfigured server. Cannot find the selected logical.',
						);
					}

					setLastChoiceWithCurrentOptions({
						connected: true,
						...choice,
					});
					goTo('world');
					await connectToServer(logical);
				});
			});

		configureLinks(subArea || area, triggerLinkButton);
		configureGoToButtons(subArea || area, goTo);
	};

	const setError = (apiError: ApiError | Error | ErrorDump | undefined) => {
		handleError(apiError);

		const id = (apiError as ApiError)?._id;
		(async () => {
			return Object.assign(
				{blockingError: '', error: '', restartOnClose: false},
				apiError &&
					!(
						id &&
						(await storage.getItem<{value: number}>('closed-' + id))?.value
					)
					? getErrorMessage(apiError)
					: {},
			);
		})().then(({blockingError, error, restartOnClose}) => {
			errorModal.setAttribute(
				'data-error-restart-on-close',
				restartOnClose ? '1' : '0',
			);
			errorModal.style.display = blockingError ? 'flex' : 'none';

			if (id) {
				errorModal.setAttribute('data-error-id', id);
			}

			(
				errorModal.querySelector('.modal-error-slot') as HTMLDivElement
			).innerHTML = blockingError;
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
			configureButtons(errorSlot);
			configureButtons(errorModal);
		});
	};

	let user: User | undefined;

	try {
		user = await requireUser();
	} catch (e) {
		if (
			e instanceof RefreshTokenError ||
			(e as RefreshTokenError).logout ||
			(!state.restarted && isUnauthorizedError(e))
		) {
			state.restarted = true;
			await saveSession({});

			triggerPromise(start(area));

			return;
		}

		setDisplayStyle(spinner, 'none');
		setDisplayStyle(loggedView, 'block');

		setError(e as ApiError);

		user = undefined;
	}

	if (!user) {
		return;
	}

	let logicals: Logical[] = [];
	const [logicalsInput, cities, features] = await Promise.all([
		getSortedLogicals(),
		getCities(session.uid),
		loadAllFeatures(),
	]);
	logicals = logicalsInput;
	isSecureCoreEnabled = () => features.secureCore.config.value;

	if (!features.telemetry.feature.isAvailable()) {
		area
			.querySelectorAll<HTMLDivElement>('.telemetry-block')
			.forEach((block) => {
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

		area.querySelectorAll<HTMLSpanElement>('.city-name').forEach((city) => {
			const englishName = city.getAttribute('data-english-city-name');
			const countryCode = city.getAttribute('data-country-code');

			if (!englishName || !countryCode) {
				return;
			}

			city.innerHTML = escapeHtml(
				(cities[countryCode] || {})[englishName] || englishName,
			);
		});

		area
			.querySelectorAll<HTMLSpanElement>('.country-name')
			.forEach((country) => {
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
	(limitedUi
		? upsell(user?.VPN?.BrowserExtensionPlan || 'VPN Plus')
		: new Promise<ApiError | Error | ErrorDump | undefined>((resolve) => {
				resolve(connectionState.error);
			})
	).then((error) => {
		setError(error);
	});

	const countries: CountryList = {};
	const freeCountries = {} as Record<string, true>;

	logicals.forEach((logical) => {
		// Don't bother paid users with free servers
		if (hasAccessToPaidServers && logical.Tier === 0) {
			return;
		}

		const country = logical.ExitCountry;

		if (logical.Tier <= 0) {
			freeCountries[country] = true;
		}

		logical.EntryCountryName = getCountryName(logical.EntryCountry, 'en');

		if (!logical.Translations) {
			logical.Translations = {};
		}

		logical.Translations.EntryCountryName = getCountryName(
			logical.EntryCountry,
		);
		const isSecureCore = logical.Features & Feature.SECURE_CORE;
		const groupType = isSecureCore
			? 'secureCore'
			: logical.City
				? 'city'
				: logical.Features & Feature.TOR
					? 'tor'
					: logical.Tier < 1
						? 'free'
						: 'other';
		const groupEnglishName =
			(!isSecureCore && logical.City) || ucfirst(groupType);
		const groupName = isSecureCore
			? c('Info').t`Secure Core`
			: logical.Translations?.City ||
				logical.City ||
				(
					{
						tor: 'TOR',
						free: /* translator: it's for free servers that can be accessed without paid subscription */ c(
							'Label',
						).t`Free`,
					} as Record<typeof groupType, string>
				)[groupType] ||
				/* translator: server fallback type */ c('Label').t`Other`;

		const infos =
			countries[country] ||
			(countries[country] = {
				englishName: getCountryNameOrCode(country, 'en'),
				name: getCountryNameOrCode(country),
				needUpgrade: true,
				groups: {},
			});

		if (!infos.groups) {
			infos.groups = {};
		}

		infos.needUpgrade = infos.needUpgrade && userTier < logical.Tier;

		const group =
			infos.groups[groupEnglishName] ||
			(infos.groups[groupEnglishName] = {
				type: groupType,
				englishName: groupEnglishName,
				name: groupName,
				needUpgrade: true,
				logicals: [],
			});
		group.needUpgrade = group.needUpgrade && userTier < logical.Tier;
		(group.logicals || (group.logicals = [])).push(logical);
	});

	const servers = area.querySelector('#servers') as HTMLDivElement;

	if (!proxySupported) {
		return;
	}

	setDisplayStyle(spinner, 'none');
	setDisplayStyle(loggedView, 'block');

	servers.classList[limitedUi ? 'add' : 'remove']('not-allowed-by-plan');

	const setServersHtml = (html: string, search = '') => {
		if (servers.innerHTML !== html) {
			servers.innerHTML = html;
		}

		if (search === '') {
			return;
		}

		configureLookupSearch(
			servers,
			userTier,
			(div) => {
				configureButtons(div);
				configureServerGroups(div);
			},
			search,
		);
	};

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

	let refresh = () => {
		locationList(
			countries,
			userTier,
			features.secureCore.config,
			features.recents,
		).then((list) => {
			setServersHtml(list);
			configureArea(area);
		});
	};
	refresh();

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

	// Load unique DOM elements
	const serverStatusSlot = area.querySelector(
		'#status .connection-status',
	) as HTMLDivElement;
	const signOutButton = area.querySelector(
		'button.sign-out-button',
	) as HTMLDivElement;
	const switchButton = area.querySelector(
		'button.switch-account-button',
	) as HTMLDivElement;
	const menu = area.querySelector('#menu') as HTMLDivElement;
	const quickConnectButton = area.querySelector(
		'.quick-connect-button',
	) as HTMLDivElement;
	const disconnectButton = area.querySelector(
		'#status button.disconnection-button',
	) as HTMLDivElement;

	const freeCountriesListEl = area.querySelector(
		'#free-countries-list',
	) as HTMLDivElement;
	const freeCountriesCountEl = area.querySelector(
		'#free-server-countries-count',
	) as HTMLSpanElement;
	const freeCountryItemTemplate = area.querySelector(
		'#free-country-item-template',
	) as HTMLTemplateElement;

	disconnectButton.innerHTML = c('Action').t`Disconnect`;

	const disconnect = async (type: StateChange = StateChange.DISCONNECT) => {
		const previousServer = connectionState?.server;
		const previousLogical = previousServer?.id
			? getLogicalById(previousServer.id)
			: undefined;

		state.connected = false;
		refreshConnectionStatus();
		setLastChoiceWithCurrentOptions({connected: false});

		connectEventHandler.disconnect(previousLogical, previousServer);

		await sendMessageToBackground(type);
	};

	disconnectButton.addEventListener('click', async () => {
		await disconnect();
	});

	const showFreeQuickConnect = simplifiedUi && isFreeTier;

	let connectionAttemptTime = 0;
	let connectingChecker: ReturnType<typeof setInterval> | undefined = undefined;

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

	const refreshConnectionStatus = (
		server?: ServerSummary,
		connecting = false,
	) => {
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
			connectingChecker = setInterval(() => {
				sendMessageToBackground(StateChange.CONNECTING, {
					connectionAttemptTime,
				});
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
		toggleClass(serverStatusSlot, state.connected, 'success', 'danger');

		const baseCountries = ['US', 'NL', 'JP'];
		const freeCountriesList = [
			...baseCountries.filter((country) => freeCountries[country]),
			...Object.keys(freeCountries).filter(
				(country) => !baseCountries.includes(country),
			),
		];

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

			freeCountriesCountEl.textContent =
				Object.keys(freeCountries).length.toString();
		}

		triggerPromise(refreshLocationSlots(area, true));

		if (state.connected) {
			const recentLocationSlots = area.querySelectorAll<HTMLDivElement>(
				'.recent-locations-slot',
			);

			if (recentLocationSlots.length > 0) {
				getLastChoices().then((choices) => {
					recentLocationSlots.forEach((recentLocationSlot) => {
						recentLocationSlot.innerHTML = recentLocations(choices, countries);
						configureArea(recentLocationSlot);
					});
				});
			}
		}
	};

	triggerPromise(showNotifications(area));

	getInfoFromBackground(BackgroundData.PM_USER).then((pmUser) => {
		pmUserCache = {user: pmUser};
		const name = escapeHtml(
			pmUser.DisplayName || pmUser.Name || pmUser.Email || '',
		);

		area
			.querySelectorAll<HTMLDivElement>('.pm-user-name')
			.forEach((userName) => {
				userName.innerHTML = name;
			});
	});

	const plan = escapeHtml(
		user.VPN.PlanTitle ||
			/* translator: plan title for free users */ c('Label').t`Free`,
	);

	area.querySelectorAll<HTMLDivElement>('.pm-plan').forEach((planName) => {
		planName.innerHTML = plan;
	});

	area
		.querySelectorAll<HTMLDivElement>('[data-open-account-page]')
		.forEach((button) => {
			setNewTabLinkTitle(button);
			button.addEventListener('click', async () => {
				const url = accountURL + button.getAttribute('data-open-account-page');

				await openTab(await appendUpgradeParams(url));
				forgetAccount();
			});
		});

	area
		.querySelectorAll<HTMLInputElement>('.theme-choice input')
		.forEach((input) => {
			input.addEventListener('change', async () => {
				if (input.checked) {
					const value = input.value as Theme;
					setTheme(value);
					await storedTheme.set({value});
				}
			});
		});

	const rateUsModal = area.querySelector<HTMLDialogElement>('#rate-us');

	const connectToServer = async (logical: Logical) => {
		connectEventHandler.connect(logical);

		const server = pickServerInLogical(logical);

		if (!server) {
			throw new Error(
				'Misconfigured server. Cannot find an entry for this server.',
			);
		}

		try {
			const willHaveToConnect = !state.connected;
			state.connected = true;
			refreshConnectionStatus(
				{
					id: logical.ID,
					name: logical.Name,
					exitIp: server.ExitIP,
					entryCountry: logical.EntryCountry,
					exitCountry: logical.ExitCountry,
					exitCity: logical.Translations?.City || logical.City,
					exitEnglishCity: logical.City,
					secureCore: (logical.Features & Feature.SECURE_CORE) !== 0,
				},
				willHaveToConnect,
			);
			await sendMessageToBackground(StateChange.CONNECT, {
				server,
				logical,
				user,
				splitTunneling: getSplitTunnelingConfig(
					userTier,
					features.splitTunneling.config,
				),
			});

			if (logical.ID) {
				triggerPromise(
					lookups.transactionValue(
						(value) => {
							const id = `${logical.ID}`;

							// If this ID was obtained by lookup, then update the time so it does not
							// get picked first when cleaning up old IDs
							if (value[id]) {
								value[id] = Date.now();
							}

							return value;
						},
						{} as Record<string, number>,
					),
				);
			}

			await setReviewInfoStateOnConnectAction();
			maybeShowRatingModal(rateUsModal, user);
		} catch (e) {
			setError(e as Error);
		}
	};

	const closeSession = async (action: StateChange) => {
		if (state.connected) {
			const mainArea = area.querySelector<HTMLDivElement>('.main-area');

			if (mainArea) {
				const confirmModal = document.createElement('div');
				confirmModal.classList.add('confirm-modal');
				confirmModal.innerHTML = `<div>
					${c('Confirm')
						.t`Logging out of the application will disconnect the active VPN connection. Do you want to continue?`}
					<div class="user-buttons-bar">
						<button data-st-action="cancel" class="tertiary-button" data-trans data-context="Action">Cancel</button>
						<button data-st-action="ok" class="primary-button" data-trans data-context="Action">OK</button>
					</div>
				</div>`;
				mainArea.appendChild(confirmModal);

				confirmModal
					.querySelectorAll<HTMLButtonElement>('[data-st-action="cancel"]')
					.forEach((button) => {
						button.addEventListener('click', () => {
							mainArea.removeChild(confirmModal);
						});
					});
				confirmModal
					.querySelectorAll<HTMLButtonElement>('[data-st-action="ok"]')
					.forEach((button) => {
						button.addEventListener('click', async () => {
							confirmModal
								.querySelectorAll<HTMLButtonElement>('[data-st-action]')
								.forEach((otherButton) => {
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
				logicals,
				connectionState?.server?.exitCountry,
			);
			const filteredLogicals = filterLogicalsWithCurrentFeatures(
				alienLogicals,
				userTier,
				features.secureCore.config,
			);
			const logical = requireRandomLogical(
				filteredLogicals,
				userTier,
				setError,
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
				logicals,
				userTier,
				features.secureCore.config,
			),
			userTier,
			setError,
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

	const backStates: {name: string; content: string}[] = [];

	area
		.querySelectorAll('[data-page="region"] .page-title .back-button')
		.forEach((button) => {
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
	}

	configureGoToButtons(area, goTo);

	const centralView = area.querySelector<HTMLDivElement>('.central-view');

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

	const search = area.querySelector('#search-input') as HTMLInputElement;

	if (search) {
		search.focus();
		search.onkeyup = (e) => {
			if (e.key === 'Enter' || e.keyCode === 13) {
				const firstButton = servers.querySelector<HTMLElement>(
					'.server, .connect-option',
				);

				if (firstButton) {
					firstButton.click();
				}
			}
		};
		let lastSearchStart = 0;
		refresh = setUpSearch(search, async (searchText) => {
			const searchStart = Date.now();
			lastSearchStart = searchStart;
			const searching = searchText !== '';

			if (!servers.querySelector(':scope > .spinner')) {
				setServersHtml(`<div class="spinner">
					<div class="lds-ring"><div></div><div></div><div></div><div></div></div>
				</div>`);
			}

			// Wait a bit for consecutive letters typed
			await delay(searching ? 300 : 1);

			if (lastSearchStart !== searchStart) {
				return;
			}

			setServersHtml(
				searching
					? getSearchResult(
							countries,
							searchText,
							userTier,
							features.secureCore.config,
						)
					: await locationList(
							countries,
							userTier,
							features.secureCore.config,
							features.recents,
						),
				searchText,
			);
			configureArea(area);
		});

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
			document,
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
	}

	configureModalButtons(area.querySelector<HTMLDivElement>('#modals')!);
	configureRatingModalButtons(rateUsModal);

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
					showSigningView(
						area.querySelector('#sign-in-view'),
						loggedView,
						spinner,
						proxySupported,
					);
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

	const settingsPageTitle = area.querySelector(
		'*[data-page="settings"] .page-title',
	);

	settingsPageTitle?.addEventListener('dblclick', (event) => {
		const settingPage = area.querySelector('*[data-page="settings"]');

		if (!settingPage) {
			return;
		}

		const keyEvent = event as any;

		if (keyEvent.ctrlKey && keyEvent.altKey) {
			settingPage.classList.toggle('debug-mode');
		}
	});

	const maxTierInput = area.querySelector(
		'#max-tier',
	) as HTMLInputElement | null;
	maxTierInput?.addEventListener('input', async () => {
		const root = global as unknown as {logicalMaxTier: number};
		const oldValue = root.logicalMaxTier || 2;
		const newValue = Number(maxTierInput.value);

		if (oldValue === newValue) {
			return;
		}

		root.logicalMaxTier = newValue;
		await start(area);
	});

	maybeShowRatingModal(rateUsModal, user);

	setTimeout(updateLastActivityTime, 1);
	setInterval(updateLastActivityTime, getActivityCheckInterval());
};
