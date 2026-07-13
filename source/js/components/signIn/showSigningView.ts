import {getServersCount} from '../../vpn/getServersCount';
import {c} from '../../tools/translate';
import {openForkTab} from '../../account/openForkTab';
import {triggerPromise} from '../../tools/triggerPromise';
import {initOnboarding} from '../../vpn/initOnboarding';
import {requiresToAskConsentForOptionalMetricsEarly} from './requiresToAskConsentForOptionalMetricsEarly';
import {proxyPermission} from '../../vpn/proxyPermission';
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
		chrome.permissions.contains(proxyPermission, (ok) => {
			if (!ok) {
				triggerPromise(
					showSigningViewAndWaitForItToBeLoaded(
						signInView,
						loggedView,
						spinner,
						false,
					),
				);
			}
		});
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
	const setSignInButtonLabel = (label = '') => {
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
		signIn.innerHTML = c('Action').t`Update`;

		const errorMessage = (error as ApiError)?.Error || getErrorAsString(error);

		if (paragraphs[0]) {
			paragraphs[0].classList.remove('incentive-paragraph');
			paragraphs[0].innerHTML = '⚠️ ' + errorMessage;
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

		if (!(await browser.permissions.request(proxyPermission))) {
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
	}

	if (!proxySupported || !signupEnabled) {
		setDisplayStyle(paragraphs[1], 'none');
		setDisplayStyle(signUp, 'none');

		return;
	}

	if (!hasPartnerOauth && paragraphs[1]) {
		paragraphs[1].style.display = '';
		paragraphs[1].innerHTML = /* translator: this sentence is followed by a button [Create an account] */ c(
			'Action',
		).t`New to Proton?`;
	}

	if (signUp) {
		signUp.style.display = '';
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
