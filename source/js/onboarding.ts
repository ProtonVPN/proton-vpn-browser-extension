import {openForkTab} from './account/openForkTab';
import {proxyPermission} from './vpn/proxyPermission';
import {triggerPromise} from './tools/triggerPromise';
import {fetchTranslations, translateArea} from './tools/translate';
import {stopEvent} from './tools/stopEvent';
import type {RequestForkAction} from './account/fork/requestFork';
import {signupEnabled} from './config';
import {CrashReports} from './vpn/features/CrashReports';
import {sendMessageToBackground} from './tools/sendMessageToBackground';
import {PermissionGrant} from './messaging/MessageType';
import {requiresToAskConsentForOptionalMetricsEarly} from './components/signIn/requiresToAskConsentForOptionalMetricsEarly';

fetchTranslations().then(() => {
	translateArea(document);
});

const eachElement = <T extends Element>(
	selectors: string,
	callback: (element: T, key: number, parent: NodeListOf<T>) => void,
) => {
	document.querySelectorAll<T>(selectors).forEach(callback);
};

const onClick = <T extends HTMLElement = HTMLButtonElement>(
	selectors: string,
	listener: (button: T, event: PointerEvent) => void,
) => {
	eachElement<T>(selectors, (button) => {
		button.addEventListener('click', (event) => {
			listener(button, event);
		});
	});
};

const showSection = (sectionName: string, condition: boolean) => {
	eachElement<HTMLElement>(`[data-if="${sectionName}"]`, (element) => {
		element.style.display = condition ? 'block' : 'none';
	});
};

requiresToAskConsentForOptionalMetricsEarly().then(
	(requiresExplicitConsentForAnonymousTelemetry) => {
		showSection(
			'signup',
			!requiresExplicitConsentForAnonymousTelemetry && signupEnabled,
		);
		showSection('login', !requiresExplicitConsentForAnonymousTelemetry);
		showSection('consent', requiresExplicitConsentForAnonymousTelemetry);
	},
);

onClick('.login-button, .signup-link', async (button, event) => {
	if (`${button.tagName}`.toLowerCase() === 'a') {
		stopEvent(event);
	}

	const action = (button.getAttribute('data-action') || undefined) as
		| RequestForkAction
		| undefined;
	const proxySupported: boolean = !!(
		chrome.proxy &&
		(await new Promise((resolve) => {
			chrome.permissions.contains(proxyPermission, (ok) => {
				resolve(ok);
			});
		}))
	);

	if (!proxySupported) {
		chrome.permissions.request(proxyPermission, (ok) => {
			if (ok) {
				triggerPromise(openForkTab({action}));
				triggerPromise(sendMessageToBackground(PermissionGrant.PROXY));
			}
		});

		return;
	}

	await openForkTab({action});
});

const toggles: Record<string, boolean> = {};

eachElement<HTMLButtonElement>('[data-toggle]', (button) => {
	const name = button.getAttribute('data-toggle')!;
	toggles[name] = button.classList.contains('activated');

	button.addEventListener('click', (event) => {
		stopEvent(event);

		toggles[name] = button.classList.toggle('activated');
	});
});

onClick('.consent-button', async () => {
	showSection('signup', signupEnabled);
	showSection('login', true);
	showSection('consent', false);

	triggerPromise(
		(await CrashReports.create())
			.getCacheItem()
			.setValue(toggles['crash-reports']!),
	);
});
