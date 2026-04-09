import {saveSession} from './saveSession';
import type {Session} from './Session';
import {
	prepareSigningView,
	showSigningView,
} from '../components/signIn/showSigningView';
import {notifyStateChange} from '../tools/notifyStateChange';

export const createSession = async (
	area?: HTMLElement,
	session: Session = {},
): Promise<boolean> => {
	prepareSigningView();

	await saveSession(session);

	if (!area) {
		return true;
	}

	const spinner = area.querySelector<HTMLElement>('#spinner');
	const signInView = area.querySelector<HTMLElement>('#sign-in-view');
	const loggedView = area.querySelector<HTMLElement>('#logged-view');

	if (!signInView || !loggedView || !spinner) {
		notifyStateChange('logged-out');

		return false;
	}

	showSigningView(signInView, loggedView, spinner);

	return false;
};
