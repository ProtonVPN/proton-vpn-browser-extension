import {triggerPromise} from './triggerPromise';
import {c} from './translate';

const setIcon = (icon: string, title?: string): void => {
	const action = chrome.action || chrome.browserAction;

	if (!action) {
		return;
	}

	triggerPromise(action.setIcon({
		path: browser.runtime.getURL('/img/' + icon),
	}));

	if (typeof title === 'string') {
		triggerPromise(action.setTitle({ title }));
	}
};

const states = {
	loggedOut: () => c('Label').t`Unprotected`,
	off: () => c('Label').t`Unprotected`,
	on: () => c('Label').t`Protected`,
	error: () => c('Error').t`Network error.`,
	warning: () => c('Error').t`Network error.`,
	connecting: () => /* translator: Connection in progress to a VPN server (hover tooltip) */
		c('Label').t`Connecting`,
};

let blinkTimeout: NodeJS.Timeout | undefined = undefined;

export const setButton = (state: keyof typeof states, title?: string): void => {
	if (blinkTimeout) {
		clearTimeout(blinkTimeout);
	}

	const status = title || states[state]();
	const hoverText = // translator: This is the hover tooltip of the browser extension button, ${status} can be "Unprotected", "Protected - Paris #12", etc.
		c('Status').t`Proton VPN: ${status}`;

	setIcon(
		`state-${({
			loggedOut: 'not-logged-in',
			off: 'unprotected-1',
			connecting: 'unprotected-2',
			on: 'protected',
		} as Record<keyof typeof states, string>)[state] || state}.png`,
		hoverText,
	);

	if (state === 'connecting') {
		blinkTimeout = setTimeout(() => {
			setIcon(`state-unprotected-1.png`, hoverText);

			blinkTimeout = setTimeout(() => {
				setButton(state, title);
			}, 700);
		}, 700);
	}
};
