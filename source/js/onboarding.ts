import {openForkTab} from './account/openForkTab';
import {proxyPermission} from './vpn/proxyPermission';
import {triggerPromise} from './tools/triggerPromise';
import {fetchTranslations, translateArea} from './tools/translate';
import {RequestForkAction} from './account/fork/requestFork';
import {signupEnabled} from './config';

fetchTranslations().then(() => {
	translateArea(document);
});

if (signupEnabled) {
	document.querySelectorAll<HTMLElement>('[data-if="signup"]').forEach(element => {
		element.style.display = 'block';
	});
}

document.querySelectorAll<HTMLButtonElement>('.login-button, .signup-link').forEach(button => {
	button.addEventListener('click', async (event) => {
		if (`${button.tagName}`.toLowerCase() === 'a') {
			event.preventDefault();
			event.stopPropagation();
		}

		const action = (button.getAttribute('data-action') || undefined) as RequestForkAction | undefined;
		const proxySupported: boolean = !!(chrome.proxy && await new Promise(resolve => {
			chrome.permissions.contains(proxyPermission, (ok) => {
				resolve(ok);
			});
		}));

		if (!proxySupported) {
			chrome.permissions.request(proxyPermission, (ok) => {
				if (ok) {
					triggerPromise(openForkTab({ action }));
				}
			});

			return;
		}

		await openForkTab({ action });
	});
});
