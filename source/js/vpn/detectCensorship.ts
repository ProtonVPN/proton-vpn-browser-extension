import {getCachedServersCount, getServersCount} from './getServersCount';
import {delay} from '../tools/delay';
import {hasSession} from '../account/readSession';
import {type CacheWrappedValue, Storage, storage} from '../tools/storage';
import {getCacheAge} from '../tools/getCacheAge';
import {milliSeconds} from '../tools/milliSeconds';
import {triggerPromise} from '../tools/triggerPromise';
import type {CensorshipDetected} from '../tools/broadcastMessage';
import {broadcastMessage} from '../tools/broadcastMessage';
import type {NotificationSummary} from '../notifications/emitNotification';
import {
	emitNotification,
	listenButtonClick,
} from '../notifications/emitNotification';
import {c} from '../tools/translate';
import {openTab} from '../tools/openTab';
import {getNavigator} from '../tools/getNavigator';
import {getBrowser} from '../tools/getBrowser';

const apiReachability = storage.item<CacheWrappedValue<boolean>>(
	'api-reachability',
	Storage.LOCAL,
);

const gitHubReachability = storage.item<CacheWrappedValue<boolean>>(
	'github-reachability',
	Storage.LOCAL,
);

const getGitHubDownloadURL = (): string => {
	const userAgent = `${getNavigator()?.userAgent}`.toLowerCase();

	if (/mac\s?os/.test(userAgent)) {
		return 'https://github.com/ProtonVPN/ios-mac-app/releases?q=macos&expanded=true';
	}

	if (/(unix|linux)/.test(userAgent)) {
		return 'https://github.com/ProtonVPN/proton-vpn-gtk-app';
	}

	return 'https://github.com/ProtonVPN/win-app/releases';
};

type LikelyCensored = {
	likelyCensored: true;
	apiReachable: false;
	githubReachable: true;
	url: string;
	message: string;
};

type UnlikelyCensored = {
	likelyCensored: false;
	apiReachable: boolean;
	githubReachable: boolean;
};

type CensorshipDetectionResult = LikelyCensored | UnlikelyCensored;

export const getCensoredResponse = () => {
	const url = getGitHubDownloadURL();
	const link = `<a class="download-link" href="${url}">get it on GitHub</a>`;

	return {
		likelyCensored: true,
		apiReachable: false,
		githubReachable: true,
		url,
		message: c('Info')
			.t`Your network appears to be blocking Proton, and this extension can't bypass this block. The desktop app likely can, ${link}.`,
	} as LikelyCensored;
};

export const getLastCensorshipDetectionResult =
	async (): Promise<CensorshipDetectionResult> => {
		const apiCache = await apiReachability.get();
		let gitHubCache = undefined;

		if (
			apiCache?.value === false &&
			getCacheAge(apiCache) < milliSeconds.fromHours(1)
		) {
			gitHubCache = await gitHubReachability.get();

			if (gitHubCache && getCacheAge(gitHubCache) < milliSeconds.fromHours(1)) {
				return gitHubCache.value
					? getCensoredResponse()
					: {
							likelyCensored: false,
							apiReachable: apiCache?.value ?? true,
							githubReachable: gitHubCache?.value ?? true,
						};
			}
		}

		return {
			likelyCensored: false,
			apiReachable: apiCache?.value ?? true,
			githubReachable: gitHubCache?.value ?? true,
		};
	};

const testApi = async (): Promise<boolean> =>
	new Promise((resolve) => {
		getServersCount().then(async () => {
			resolve(Boolean(await getCachedServersCount()));
		});

		delay(5_000).then(() => {
			resolve(false);
		});
	});

const testGitHub = async (): Promise<boolean> =>
	new Promise((resolve) => {
		fetch('https://api.github.com/repos/ProtonVPN/win-app/releases?per_page=5')
			.then(async (response) => {
				try {
					const data = await response.json();
					resolve(data.length > 0 || /API rate limit/.test(`${data.message}`));
				} catch {
					resolve(false);
				}
			})
			.catch(() => {
				resolve(false);
			});

		delay(3_000).then(() => {
			resolve(false);
		});
	});

const isApiReachable = async (): Promise<boolean> => {
	const cache = await apiReachability.get();

	if (cache && getCacheAge(cache) < milliSeconds.fromMinutes(10)) {
		return cache.value;
	}

	const value = (await hasSession()) || (await testApi());

	triggerPromise(apiReachability.setValue(value));

	return value;
};

export const isGitHubReachable = async (maxAge?: number): Promise<boolean> => {
	const cache = await gitHubReachability.get();

	if (cache && getCacheAge(cache) < (maxAge ?? milliSeconds.fromHours(1))) {
		return cache.value;
	}

	const value = await testGitHub();

	triggerPromise(gitHubReachability.setValue(value));

	return value;
};

listenButtonClick('censorship-detected', () => {
	triggerPromise(openTab(getGitHubDownloadURL()));
});

export const detectCensorship = (): void => {
	isApiReachable().then(async (apiReachable): Promise<void> => {
		// Unable to reach Proton API, but able to reach GitHub API:
		if (!apiReachable && (await isGitHubReachable())) {
			// Where to download Proton desktop application:
			const url = getGitHubDownloadURL();
			broadcastMessage<CensorshipDetected>('censorship-detected', {url});

			const notification: NotificationSummary = {
				message: c('Info')
					.t`Your network seems to be blocking Proton. The extension can't bypass this. Try the desktop app instead.`,
			};

			if (getBrowser().type !== 'firefox') {
				notification.buttons = [{title: 'Download'}];
			}

			emitNotification('censorship-detected', notification);
		}
	});
};
