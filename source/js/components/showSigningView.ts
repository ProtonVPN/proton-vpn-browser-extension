import {getServersCount} from '../vpn/getServersCount';
import {c, getNumberFormatter, msgid} from '../tools/translate';
import {openForkTab} from '../account/openForkTab';
import {triggerPromise} from '../tools/triggerPromise';
import {proxyPermission} from '../vpn/proxyPermission';
import {signupEnabled} from '../config';
import {sendMessageToBackground} from '../tools/sendMessageToBackground';
import {PermissionGrant} from '../messaging/MessageType';
import {getServerCountsDisplayTTL} from '../intervals';
import {getUpdateError} from '../tools/update';
import {openTab} from '../tools/openTab';
import {getBrowser} from '../tools/getBrowser';
import {ApiError} from '../api';
import {Counts} from '../vpn/Counts';

let serverCount: number | undefined = undefined;
let serverCountLastCheck = 0;
const serverTruncateFactor = 100;

const truncateBy = (number: number, factor: number): number => {
	const truncatedCount = Math.floor(number / factor) * factor;

	return truncatedCount === serverCount
		? truncatedCount - serverTruncateFactor
		: truncatedCount;
};

const refreshIncentiveParagraph = (area?: HTMLElement) => {
	serverCount || (serverCount = 6553);

	const truncatedCount = truncateBy(serverCount, serverTruncateFactor);
	const count = getNumberFormatter().format(truncatedCount);

	if (!(area && ('querySelectorAll' in area))) {
		return;
	}

	area.querySelectorAll<HTMLParagraphElement>('.incentive-paragraph').forEach(paragraph => {
		paragraph.innerHTML = c('Info').plural(
			truncatedCount,
			msgid`High performance Swiss VPN that protects your privacy. Maximum security, more than ${count} server and no restrictions.`,
			`High performance Swiss VPN that protects your privacy. Maximum security, more than ${count} servers and no restrictions.`,
		);
	});
};

export const prepareSigningView = (): Promise<Counts> | undefined => {
	const age = Date.now() - serverCountLastCheck;

	if (age > getServerCountsDisplayTTL()) {
		return getServersCount().then(counts => {
			serverCount = counts.Servers;
			serverCountLastCheck = Date.now();
			refreshIncentiveParagraph();

			return counts;
		});
	}

	return undefined;
};

export const showSigningView = (
	signInView: HTMLElement | null,
	loggedView: HTMLElement | null,
	spinner: HTMLElement | null,
	proxySupported?: boolean,
): void => {
	if (!signInView || !loggedView) {
		triggerPromise(openForkTab());

		return;
	}

	proxySupported = !!(typeof proxySupported === 'undefined'
		? chrome.proxy
		: (proxySupported && chrome.proxy)
	);

	if (proxySupported) {
		chrome.permissions.contains(proxyPermission, (ok) => {
			if (!ok) {
				showSigningView(signInView, loggedView, spinner, false);
			}
		});
	}

	const showUpdateError = (error: ApiError) => {
		signIn.classList.add('update-extension');
		signIn.innerHTML = c('Action').t`Update`;

		if (paragraphs[0]) {
			paragraphs[0].classList.remove('incentive-paragraph');
			paragraphs[0].innerHTML = '⚠️ ' + error.Error;
		}

		if (paragraphs[1]) {
			paragraphs[1].style.display = 'none';
		}

		if (signUp) {
			signUp.style.display = 'none';
		}
	}

	prepareSigningView()?.catch(showUpdateError);

	signInView.style.display = 'block';
	loggedView.style.display = 'none';

	if (spinner) {
		spinner.style.display = 'none';
	}

	const paragraphs = signInView.querySelectorAll<HTMLElement>('p');

	const signUp = signInView.querySelector('button.sign-up-button') as HTMLElement;
	const signIn = signInView.querySelector('button.sign-in-button') as HTMLElement;
	signIn.classList.remove('update-extension');
	signIn.innerHTML = proxySupported
		? c('Action').t`Sign in`
		: c('Action').t`Next`;
	signIn.addEventListener('click', async () => {
		if (signIn.classList.contains('update-extension')) {
			triggerPromise(openTab(getBrowser().pluginsUrl));
			window.close();

			return;
		}

		const timer = setTimeout(() => {
			window.close();
		}, 200);

		if (!await browser.permissions.request(proxyPermission)) {
			return;
		}

		// If proxy has been just granted (was not granted before and request didn't make us quit the function
		if (!proxySupported) {
			triggerPromise(sendMessageToBackground(PermissionGrant.PROXY));
		}

		clearTimeout(timer);
		await openForkTab();
		window.close();
	});

	// Scroll to make CTA visible
	setTimeout(() => {
		signIn.scrollIntoView();
	});

	if (paragraphs[0]) {
		if (!proxySupported) {
			paragraphs[0].classList.remove('incentive-paragraph');
			paragraphs[0].innerHTML = `<b>${/* translator: title of the first install step */ c('Info').t`Allow VPN permissions`}</b><br><br>`
				+ c('Info').t`To get started, you’ll need to enable VPN permissions on your browser.`
				+ '<br><br>'
				+ c('Info').t`Press <b>Next</b>, then click <b>Allow</b> on the pop-up from your browser.`
				+ '<br><br>'
				+ /*
				* translator: previous sentence is "then click <b>Allow</b> on the pop-up from your browser."
				*/c('Info').t`Then just click the Proton VPN icon to sign in.`;

			return;
		}

		paragraphs[0].classList.add('incentive-paragraph');
		refreshIncentiveParagraph(signInView);
	}

	if (!proxySupported || !signupEnabled) {
		if (paragraphs[1]) {
			paragraphs[1].style.display = 'none';
		}

		if (signUp) {
			signUp.style.display = 'none';
		}

		return;
	}

	if (paragraphs[1]) {
		paragraphs[1].style.display = '';
		paragraphs[1].innerHTML = /* translator: this sentence is followed by a button [Create an account] */ c('Action').t`New to Proton?`;
	}

	if (signUp) {
		signUp.style.display = '';
		signUp.innerHTML = /* translator: this button is preceded by a sentence "New to Proton?" */ c('Action').t`Create an account`;

		signUp.addEventListener('click', async () => {
			await openForkTab('signup');
			window.close();
		});
	}

	getUpdateError().then(error => {
		if (error) {
			showUpdateError(error);
		}
	});
};
