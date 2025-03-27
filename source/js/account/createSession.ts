import {saveSession} from './saveSession';
import {Session} from './Session';
import {prepareSigningView, showSigningView} from '../components/signIn/showSigningView';
import {notifyStateChange} from '../tools/notifyStateChange';

const root = global || window;
root.browser || ((root as any).browser = chrome);

export const createSession = async (session: Session = {}): Promise<boolean> => {
	prepareSigningView();

	await saveSession(session);

	const spinner = document.getElementById('spinner');
	const signInView = document.getElementById('sign-in-view');
	const loggedView = document.getElementById('logged-view');

	if (!signInView || !loggedView) {
		notifyStateChange('logged-out');

		return false;
	}

	showSigningView(signInView, loggedView, spinner);

	return false;
};

export const startSession = (session: Session = {}) => createSession(session);
