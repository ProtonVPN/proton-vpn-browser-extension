import {getServersCount} from '../../vpn/getServersCount';
import {c} from '../../tools/translate';
import {openForkTab} from '../../account/openForkTab';
import {triggerPromise} from '../../tools/triggerPromise';
import {initOnboarding} from '../../vpn/initOnboarding';
import {requiresToAskConsentForOptionalMetricsEarly} from './requiresToAskConsentForOptionalMetricsEarly';
import {proxyPermission} from '../../vpn/proxy/proxyPermission';
import {signupEnabled} from '../../config';
import {sendMessageToBackground} from '../../tools/sendMessageToBackground';
import {PermissionGrant} from '../../messaging/MessageType';
import {getServerCountsDisplayTTL} from '../../intervals';
import {getUpdateError} from '../../tools/update';
import {openTab} from '../../tools/openTab';
import {getBrowser} from '../../tools/getBrowser';
import type {Counts} from '../../vpn/Counts';
import {getErrorAsString} from '../../tools/getErrorMessage';
import {handleError} from '../../tools/sentry';
import {setDisplayStyle} from '../../tools/setDisplayStyle';
import {getOauthConfig} from '../../account/partner/oauth';
import {
	getServerCountLastCheck,
	initializeInlineParagraph,
	setServerCount,
} from './initializeInlineParagraph';
import type {ApiError} from '../../api';
import {
	getCensoredResponse,
	getLastCensorshipDetectionResult,
} from '../../vpn/detectCensorship';
import type {CensorshipDetected} from '../../tools/broadcastMessage';
import {getRuntime} from '../../tools/getRuntime';
import {hasBrowserPermission} from '../../tools/hasBrowserPermission';
import {escapeHtml} from '../../tools/escapeHtml';

let censorshipListener:
	((message: {type?: unknown} | undefined) => void) | undefined;

/**
 * Detection runs in the background and may complete after the popup
 * is open (e.g. the background was idle and woken up by the popup,
 * with expired reachability caches), so listen for its result.
 *
 * Uses `onMessage` directly rather than `watchBroadcastMessages` because
 * this module is also loaded in background (via `createSession`).
 */
const watchCensorshipDetection = (
	onDetected: (message: string) => void,
): void => {
	const runtime = getRuntime();

	if (censorshipListener) {
		runtime?.onMessage.removeListener(censorshipListener);
	}

	censorshipListener = (message) => {
		if (
			message?.type ===
			('censorship-detected' satisfies CensorshipDetected['type'])
		) {
			onDetected(getCensoredResponse().message);
		}
	};

	runtime?.onMessage.addListener(censorshipListener);
};

export const prepareSigningView = (): Promise<Counts> | undefined => {
	const age = Date.now() - getServerCountLastCheck();

	if (age > getServerCountsDisplayTTL()) {
		return getServersCount().then((counts) => {
			setServerCount(counts.Servers);

			return counts;
		});
	}

	return undefined;
};

export const showSigningViewAndWaitForItToBeLoaded = async (
	signInView: HTMLElement | null,
	loggedView: HTMLElement | null,
	spinner: HTMLElement | null,
	proxySupported?: boolean,
): Promise<void> => {
	if (!signInView || !loggedView) {
		return openForkTab();
	}

	proxySupported = !!(typeof proxySupported === 'undefined'
		? chrome.proxy
		: proxySupported && chrome.proxy);

	if (proxySupported) {
		if (!(await hasBrowserPermission(proxyPermission))) {
			await showSigningViewAndWaitForItToBeLoaded(
				signInView,
				loggedView,
				spinner,
				false,
			);

			return;
		}
	}

	const signUp = signInView.querySelector(
		'button.sign-up-button',
	) as HTMLButtonElement;
	const signIn = signInView.querySelector(
		'button.sign-in-button',
	) as HTMLButtonElement;
	const signInLink = signInView.querySelector(
		'a.sign-in-link',
	) as HTMLLinkElement;
	signIn.classList.remove('update-extension');
	/** @param {string} label A label text free of any HTML tag */
	const setSignInButtonLabel = (label: string = '') => {
		// nosemgrep:insecure-innerhtml
		signIn.innerHTML =
			label || (proxySupported ? c('Action').t`Sign in` : c('Action').t`Next`);
	};
	const oAuthConfig = await getOauthConfig();
	const hasPartnerOauth = oAuthConfig.oauthAllowed;
	const hasSignupButton = oAuthConfig.signupButton;
	const partnerOauthId = oAuthConfig.partnerId;
	const paragraphs = signInView.querySelectorAll<HTMLElement>('p');

	const showUpdateError = (context: string) => (error: unknown) => {
		if (!error) {
			return;
		}

		signIn.classList.add('update-extension');
		// nosemgrep:insecure-innerhtml
		signIn.innerHTML = c('Action').t`Update`;

		const errorMessage = String(
			(error as ApiError)?.Error || getErrorAsString(error),
		);

		if (paragraphs[0]) {
			paragraphs[0].classList.remove(
				'incentive-paragraph',
				'censorship-warning',
			);
			// nosemgrep:insecure-innerhtml
			paragraphs[0].innerHTML =
				'⚠️ ' + escapeHtml(errorMessage).replace(/\n/g, '<br>');
		}

		setDisplayStyle(paragraphs[1], 'none');
		setDisplayStyle(signUp, 'none');

		const report: Error & {previous?: unknown} = new Error(
			context + ': ' + errorMessage,
		);
		report.previous = error;
		handleError(report);
	};

	prepareSigningView()?.catch(showUpdateError('prepareSigningView'));

	if (await requiresToAskConsentForOptionalMetricsEarly()) {
		await initOnboarding();

		window?.close();

		return;
	}

	setSignInButtonLabel(
		hasPartnerOauth ? c('Action').t`Sign in with Vivaldi` : '',
	);
	signInLink.style.display = hasPartnerOauth ? 'inline' : 'none';

	if (hasPartnerOauth) {
		const signUpBox = signInView.querySelector<HTMLElement>(
			'.sign-up-button-box',
		);

		if (signUpBox && !hasSignupButton) {
			signUpBox.style.display = 'none';
		}

		signInView.classList.add('partner');
		const banner = 'img/partner-welcome-image-dark@2x.svg';
		const imageLoader = new Image();
		await new Promise((resolve) => {
			imageLoader.onload = resolve;
			imageLoader.onerror = resolve;
			imageLoader.src = banner;
			setTimeout(resolve, 1000);
		});

		(
			signInView.querySelectorAll(
				'img.welcome-background',
			) as NodeListOf<HTMLImageElement>
		).forEach((img) => {
			img.src = banner;
		});

		const h1 = signInView.querySelector('h1');
		if (h1) {
			h1.innerText = c('Title').t`Proton VPN for Vivaldi`;
		}

		const incentive = signInView.querySelector<HTMLElement>(
			'.incentive-paragraph',
		);

		if (incentive) {
			incentive.innerText = c('Info')
				.t`Protect yourself online with Proton's free high‑speed VPN.`;
		}
	}

	signInView.style.display = 'block';
	loggedView.style.display = 'none';

	setDisplayStyle(spinner, 'none');

	const openSignInTab = async (partnerId: string | undefined) => {
		const timer = setTimeout(() => {
			window?.close();
		}, 200);

		if (!(await chrome.permissions.request(proxyPermission))) {
			return;
		}

		// If proxy has been just granted (was not granted before and request didn't make us quit the function
		if (!proxySupported) {
			triggerPromise(sendMessageToBackground(PermissionGrant.PROXY));
		}

		clearTimeout(timer);
		await openForkTab({
			partnerId,
		});
		window?.close();
	};

	signIn.addEventListener('click', async () => {
		if (signIn.classList.contains('update-extension')) {
			triggerPromise(openTab(getBrowser().pluginsUrl));
			window?.close();

			return;
		}

		// Vivaldi sessions are independent because they are not persisted on account
		await openSignInTab(partnerOauthId);
	});

	if (signInLink) {
		signInLink.addEventListener('click', async () => {
			await openSignInTab(undefined);
		});
	}

	// Scroll to make CTA visible
	setTimeout(() => {
		signIn.scrollIntoView?.();
	});

	if (paragraphs[0]) {
		if (!proxySupported) {
			paragraphs[0].classList.remove('incentive-paragraph');
			// nosemgrep:insecure-innerhtml
			paragraphs[0].innerHTML =
				`<b>${/* translator: title of the first install step */ c('Info').t`Allow VPN permissions`}</b><br><br>` +
				c('Info')
					.t`To get started, you’ll need to enable VPN permissions on your browser.` +
				'<br><br>' +
				c('Info')
					.t`Press <b>Next</b>, then click <b>Allow</b> on the pop-up from your browser.` +
				'<br><br>' +
				/*
				 * translator: previous sentence is "then click <b>Allow</b> on the pop-up from your browser."
				 */ c('Info').t`Then just click the Proton VPN icon to sign in.`;

			return;
		}

		initializeInlineParagraph(signInView, paragraphs[0], hasPartnerOauth);
		const showCensorshipMessage = (message: string) => {
			// A required update takes precedence
			if (!paragraphs[0] || signIn.classList.contains('update-extension')) {
				return;
			}

			// Not an incentive anymore, so it must not be refreshed with the server count
			paragraphs[0].classList.remove('incentive-paragraph');
			paragraphs[0].classList.add('censorship-warning');
			// nosemgrep:insecure-innerhtml
			paragraphs[0].innerHTML = message;
		};
		watchCensorshipDetection(showCensorshipMessage);
		getLastCensorshipDetectionResult().then((result) => {
			if (!result.likelyCensored) {
				return;
			}

			showCensorshipMessage(result.message);
		});
	}

	if (!proxySupported || !signupEnabled) {
		setDisplayStyle(paragraphs[1], 'none');
		setDisplayStyle(signUp, 'none');

		return;
	}

	if (!hasPartnerOauth && paragraphs[1]) {
		paragraphs[1].style.display = '';
		// nosemgrep:insecure-innerhtml
		paragraphs[1].innerHTML = /* translator: this sentence is followed by a button [Create an account] */ c(
			'Action',
		).t`New to Proton?`;
	}

	if (signUp) {
		signUp.style.display = '';
		// nosemgrep:insecure-innerhtml
		signUp.innerHTML = /* translator: this button is preceded by a sentence "New to Proton?" */ c(
			'Action',
		).t`Create an account`;

		signUp.addEventListener('click', async () => {
			await openForkTab({
				action: 'signup',
				partnerId: partnerOauthId,
			});
			window?.close();
		});
	}

	getUpdateError().then(showUpdateError('getUpdateError'));
};

export const showSigningView = (
	signInView: HTMLElement | null,
	loggedView: HTMLElement | null,
	spinner: HTMLElement | null,
	proxySupported?: boolean,
): void => {
	triggerPromise(
		showSigningViewAndWaitForItToBeLoaded(
			signInView,
			loggedView,
			spinner,
			proxySupported,
		),
	);
};
