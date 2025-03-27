import {Logical} from './vpn/Logical';
import {getLogicalById, getSortedLogicals} from './vpn/getLogicals';
import {readSession} from './account/readSession';
import {sendMessageToBackground} from './tools/sendMessageToBackground';
import {getInfoFromBackground} from './tools/getInfoFromBackground';
import {getBrowser} from './tools/getBrowser';
import {startSession} from './account/createSession';
import {
	c,
	fetchTranslations,
	getCountryName,
	getCountryNameOrCode,
	getHashSeed,
	getLocaleSupport,
	getPrimaryLanguage,
	getTranslation,
	msgid,
	translateArea,
} from './tools/translate';
import {escapeHtml} from './tools/escapeHtml';
import {ApiError, getFullAppVersion, isUnauthorizedError} from './api';
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
import {getAllLogicals, requireBestLogical} from './vpn/getBestLogical';
import {getCities, mergeTranslations} from './vpn/getCities';
import {setUpSearch} from './search/setUpSearch';
import {countryList, CountryList} from './components/countryList';
import {configureServerGroups} from './vpn/configureServerGroups';
import {storage} from './tools/storage';
import {showNotifications} from './notifications/showNotifications';
import {watchBroadcastMessages} from './tools/answering';
import {ChangeStateMessage} from './tools/broadcastMessage';
import {getErrorMessage} from './tools/getErrorMessage';
import {ConnectionState, ServerSummary} from './vpn/ConnectionState';
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
	Event,
	getFeatureNames,
	getTelemetryOptIn,
	isTelemetryFeatureEnabled,
	MeasurementGroup,
	recordEvent,
	telemetryOptIn,
} from './tools/telemetry';
import {leaveWindowForTab, openTab} from './tools/openTab';
import {getSearchResult} from './search/getSearchResult';
import {getAccessSentence, upsell} from './tools/upsell';
import {forgetAccount} from './account/forgetAccount';
import {hideIf} from './tools/hideIf';
import {storedPreventWebrtcLeak} from './webrtc/storedPreventWebrtcLeak';
import {preventLeak} from './webrtc/preventLeak';
import {setWebRTCState} from './webrtc/setWebRTCState';
import {WebRTCState} from './webrtc/state';
import {popupOnly} from './context/popupOnly';
import {via} from './components/via';
import {configureSplitTunneling} from './components/configureSplitTunneling';
import {getBypassList} from './vpn/getBypassList';
import {storedSplitTunneling} from './vpn/storedSplitTunneling';
import {warn} from './log/log';
import {storedNotificationsEnabled} from './notifications/notificationsEnabled';
import {RefreshTokenError} from './account/RefreshTokenError';
import {InitUserError} from './account/InitUserError';
import {requireUser} from './account/requireUser';
import {pickServerInLogical} from './vpn/pickServerInLogical';
import {milliSeconds} from './tools/milliSeconds';
import {appendUrlParams} from './tools/appendUrlParams';
import {crashReportOptIn, getCrashReportOptIn, handleError} from './tools/sentry';
import {getServersCount} from './vpn/getServersCount';

const state = {
	connected: false,
	restarted: false,
};

type Theme = 'dark' | 'light' | 'auto';

popupOnly('popup');

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

	const setButtonTitle = (button: HTMLElement) => {
		if (!button.getAttribute('aria-label') && !button.getAttribute('title')) {
			const linkDescription = button.innerText.trim();
			button.setAttribute(
				'title',
				// translator: explain that the link opens in a new tab
				c('Action').t`${linkDescription} (New tab)`,
			);
		}
	};

	const filterLogicalWithCurrentFeatures = (userTier: number, rawLogicals: Logical[], withTor = false) => rawLogicals.filter(
		logicial => (logicial.Features & ((withTor ? 0 : Feature.TOR) | Feature.RESTRICTED | Feature.PARTNER)) === 0 &&
			(logicial.Features & Feature.SECURE_CORE) === (userTier > 0 && secureCore?.value ? Feature.SECURE_CORE : 0)
	);

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
							getLogical: () => requireBestLogical(filterLogicalWithCurrentFeatures(userTier, logicals.filter(
								logical => (logical.Features & Feature.TOR) === 0 && !logical.City && logical.Tier > 0,
							)), userTier, setError),
							choice: {
								exitCountry: exitCountry,
								filter: 'other',
							},
						};

					case 'tor':
						return {
							getLogical: () => requireBestLogical(filterLogicalWithCurrentFeatures(userTier, logicals.filter(
								logical => logical.Features & Feature.TOR,
							), true), userTier, setError),
							choice: {
								exitCountry: exitCountry,
								requiredFeatures: Feature.TOR,
							},
						};

					case 'free':
						return {
							getLogical: () => requireBestLogical(filterLogicalWithCurrentFeatures(userTier, logicals.filter(
								logical => logical.Tier < 1,
							)), userTier, setError),
							choice: {
								exitCountry: exitCountry,
								tier: 0,
							},
						};

					default:
						return {
							getLogical: () => requireBestLogical(filterLogicalWithCurrentFeatures(userTier, logicals.filter(
								logical => logical.City === subGroup,
							)), userTier, setError),
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
					getLogical: () => requireBestLogical(filterLogicalWithCurrentFeatures(userTier, logicals.filter(
						logical => logical.EntryCountry === entryCountry,
					)), userTier, setError),
					choice: {
						exitCountry: exitCountry,
						entryCountry: entryCountry,
					},
				};
			}

			return {
				getLogical: () => requireBestLogical(filterLogicalWithCurrentFeatures(userTier, logicals), userTier, setError),
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

		const user = await timeoutAfter(
			getInfoFromBackground(BackgroundData.PM_USER),
			milliSeconds.fromSeconds(30),
			'User loading timed out',
			InitUserError,
		);

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
		(area || document).querySelectorAll<HTMLButtonElement>('.expand-button').forEach(button => {
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
					(id && document.getElementById(id)?.innerHTML) || '',
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
			const hashSeed = getHashSeed(button.dataset);
			const forget = !!(button.classList.contains('upgrade-button') || Number(button.getAttribute('data-forget-account')));
			const linkHashSeed = await getHashSeedValues(hashSeed);
			const href = link + (linkHashSeed ? '#' + linkHashSeed : '');

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

					const {
						Servers: servers,
						Countries: countries,
					} = await getServersCount();

					const rounderServersCount = Math.floor(servers / 100) * 100;

					page.querySelectorAll<HTMLElement>('.access-sentence').forEach(paragraph => {
						paragraph.innerText = getAccessSentence(
							/**
							 * 	translator: ${servers} is a number so output is like "1900 secure servers" and this goes in sentence such as "Access over 5000 secure servers in 63 countries"
							 */
							c('Error').plural(rounderServersCount, msgid`${rounderServersCount} secure server`, `${rounderServersCount} secure servers`),
							/**
							 * 	translator: ${countries} is a number so output is like "63 countries" and this goes in sentence such as "Access over 5000 secure servers in 63 countries"
							 */
							c('Error').plural(countries, msgid`${countries} country`, `${countries} countries`),
						);
					});
				}

				return;
			}

			handleLeavingAction(href, forget);
		};

		(area || document.getElementById('servers') || document).querySelectorAll<HTMLButtonElement>('.open-upgrade-page, button:not(.close-button), .connect-clickable, .server:not(.in-maintenance)').forEach(button => {
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
					throw new Error('Missconfigured server. Cannot find the selected logical.');
				}

				recordEvent(MeasurementGroup.CONNECTION, Event.VPN_CONNECTION, {}, logical);
				setLastChoiceWithCurrentOptions({
					connected: true,
					...choice,
				});
				goTo('world');
				await connectToServer(logical);
			});
		});

		const getHashSeedValues = async (hashSeed: string[]): Promise<string> => {
			if (!hashSeed.length) {
				return '';
			}

			const getPmUserValue = async (key: string, pmUserKey: keyof PmUser)=> {
				const value = (await getPmUser())?.[pmUserKey] as string | undefined;

				return value ? key + '=' + encodeURIComponent(value) : '';
			};

			return (await Promise.all(hashSeed.map(async key => {
				switch (key) {
					case 'platform':
						return key + '=' + encodeURIComponent(`VPN for ${getBrowser().name}`);

					case 'clientVersion':
						return key + '=' + encodeURIComponent(getFullAppVersion() + '+' + getBrowser().type);

					case 'username':
						return await getPmUserValue(key, 'Name');

					case 'email':
						return await getPmUserValue(key, 'Email');
				}

				warn('Unknown key ' + key);

				return '';
			}))).filter(Boolean).join('&');
		};

		each({'a[href]': 'href', '[data-href]': 'data-href'}, (selector, attribute) => {
			(area || document).querySelectorAll<HTMLDivElement>(selector).forEach(button => {
				setButtonTitle(button);
				button.addEventListener('click', (event) => {
					const url = button.getAttribute(attribute);

					if (url) {
						const localeSupport = getLocaleSupport(button.dataset);
						const primaryLanguage = getPrimaryLanguage();
						const link = localeSupport.indexOf(primaryLanguage) !== -1
							? url.replace(/^(https:\/\/protonvpn\.com\/)/, '$1' + primaryLanguage + '/')
							: url;
						event.preventDefault();
						event.stopPropagation();
						triggerLinkButton(link, button);
					}
				});
			});
		});
	};

	const setError = (apiError: ApiError | Error | undefined) => {
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

	const countries: CountryList = {};
	const userTier = getUserMaxTier(user);
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
	(limitedUi ? upsell(user?.VPN?.BrowserExtensionPlan || 'VPN Plus') : new Promise<ApiError | Error | undefined>(resolve => {
		resolve(connectionState.error);
	})).then(error => {
		setError(error);
	});
	const freeCountries = {} as Record<string, true>;

	logicals.forEach(logical => {
		// Don't bother paid users with free servers
		if (userTier >= 2 && logical.Tier === 0) {
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
		group.logicals || (group.logicals = []);
		group.logicals.push(logical);
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

	disconnectButton.innerHTML = c('Action').t`Disconnect`;

	const disconnect = async (type: StateChange = StateChange.DISCONNECT) => {
		const previousServer = connectionState?.server;
		const previousLogical = previousServer?.id ? getLogicalById(previousServer.id) : undefined;

		state.connected = false;
		refreshConnectionStatus();
		setLastChoiceWithCurrentOptions({connected: false});

		recordEvent(MeasurementGroup.CONNECTION, Event.VPN_DISCONNECTION, {
			...(previousServer ? {
				vpn_country: previousServer.exitCountry,
				server: previousServer.name,
				...(previousLogical ? {
					server_features: getFeatureNames(previousLogical.Tier, previousLogical.Features),
				} : {}),
			} : {}),
		});

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

	const showFreeQuickConnect = simplifiedUi && userTier <= 0;

	let connectionAttemptTime = 0;
	let connectingChecker: ReturnType<typeof setInterval> | undefined = undefined;

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
		quickConnectButton.style.display = canDisconnectOrCancel ? 'none' : 'block';
		document.querySelectorAll<HTMLDivElement>('.quick-connect-button-incentive').forEach(quickConnectIncentive => {
			quickConnectIncentive.style.display = canDisconnectOrCancel ? 'none' : 'block';
		});
		logo.switchTo(canDisconnectOrCancel ? 'protected' : 'unprotected');
		showConnectedItemMarker(servers, state.connected && !connecting);

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
						<path fill-rule="evenodd" d="M7.8 7.5h-.3a4.5 4.5 0 0 1 9 0H7.8ZM6 7.529V7.5a6 6 0 1 1 12 0v.029c.588.036 1.006.116 1.362.298a3 3 0 0 1 1.311 1.311C21 9.78 21 10.62 21 12.3v5.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327H7.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C3 20.22 3 19.38 3 17.7v-5.4c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311c.356-.182.774-.262 1.362-.298Zm6.706 7.295a1.5 1.5 0 1 0-1.412 0l-.654 2.617a.45.45 0 0 0 .436.559h1.848a.45.45 0 0 0 .436-.56l-.654-2.616Z" clip-rule="evenodd"/>
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
						<path fill-rule="evenodd" d="M6 1.5a6 6 0 0 1 6 6h7.2c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C24 9.78 24 10.62 24 12.3v5.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327h-8.4c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C6 20.22 6 19.38 6 17.7v-5.4c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311c.602-.307 1.38-.326 2.862-.327a4.5 4.5 0 0 0-9 0 .75.75 0 0 1-1.5 0 6 6 0 0 1 6-6Zm8.294 13.324a1.5 1.5 0 1 1 1.412 0l.654 2.617a.45.45 0 0 1-.436.559h-1.848a.45.45 0 0 1-.436-.56l.654-2.616Z" clip-rule="evenodd"/>
					</svg>
					<div id="unprotected-label" class="protection-status">${c('Label').t`Unprotected`}</div>
					${'' /*<div class="incentive">${c('Label').t`Protect yourself online`}</div>*/}
					${showFreeQuickConnect && browserExtensionEnabled ? `
						<div class="current-server-description">
							<div class="lightning">
								<svg class="lightning-symbol" viewBox="0 0 10 14">
									<path d="M2.67277 12.9704C2.61521 13.1815 2.71131 13.4043 2.90433 13.5073C3.09735 13.6103 3.33595 13.5661 3.47924 13.4008L9.57299 6.36952C9.69318 6.23083 9.72139 6.03476 9.64516 5.86782C9.56892 5.70087 9.40228 5.59377 9.21876 5.59377H6.08247L7.32724 1.02961C7.38481 0.818537 7.2887 0.595714 7.09568 0.492717C6.90266 0.389719 6.66407 0.433943 6.52078 0.599274L0.427027 7.63052C0.306832 7.76921 0.278627 7.96529 0.354858 8.13223C0.431089 8.29917 0.597732 8.40627 0.781257 8.40627H3.91755L2.67277 12.9704Z" />
								</svg>
							</div>
							<div class="fastest-server">
								<div class="current-server-country incentive">${c('Info').t`Fastest free server`}</div>
								<div class="current-server-name">
									<span class="auto-select-label">${c('Info').t`Auto-selected from`}</span>
									${freeCountriesList.length <= 3
										? getCountryFlagGroup(freeCountriesList)
										: getCountryFlagGroup(freeCountriesList.slice(0, 3)) + ' +' + (freeCountriesList.length - 3)}
								</div>
							</div>
						</div>
					` : ''}
				</div>
			`;

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
		setButtonTitle(button);
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
		const server = pickServerInLogical(logical);

		if (!server) {
			throw new Error('Missconfigured server. Cannot find an entry for this server.');
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
				bypassList: getBypassList(getUserMaxTier(user), splitTunneling.value),
			});
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
		if (limitedUi) {
			await openTab(appendUrlParams(manageAccountURL, {email: (await getPmUser())?.Email}));
			forgetAccount();

			return;
		}

		errorSlot.innerHTML = '';
		const logical = requireBestLogical(filterLogicalWithCurrentFeatures(userTier, logicals), userTier, setError);
		setLastChoice({
			connected: true,
			pick: 'fastest',
		});

		recordEvent(MeasurementGroup.CONNECTION, Event.VPN_CONNECTION, {}, logical);

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
	})

	const goTo = (page: string): void => {
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
				pageBlock.classList[pageBlock.getAttribute('data-page') === page ? 'add' : 'remove']('selected-page');
			});
		}

		document.querySelectorAll('.page-view, .page-view [data-page]').forEach(pageBlock => {
			pageBlock.scrollTop = 0;
		});

		if (loggedView) {
			loggedView.scrollTop = 0;
		}
	};

	document.querySelectorAll('[data-go-to]').forEach(button => {
		button.addEventListener('click', (event) => {
			const page = button.getAttribute('data-go-to');

			if (page) {
				goTo(page);

				button.classList.add('active');
				button.setAttribute('aria-current', 'true');
			}

			event.preventDefault();
			event.stopPropagation();
		});
	});

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

		toggleButtons(storedSecureCore, secureCore, {refresh, upgradeNeeded: userTier <= 0});
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
