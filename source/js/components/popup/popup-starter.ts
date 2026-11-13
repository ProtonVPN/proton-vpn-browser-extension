'use popup';
import {setDisplayStyle} from '../../tools/setDisplayStyle';
import {triggerPromise} from '../../tools/triggerPromise';
import {loadUserForView} from '../../account/user/loadUserForView';
import {startPreLogin} from './startPreLogin';
import {startPostLogin} from './startPostLogin';
import type {PopupState} from './PopupState';

const state: PopupState = {
	connected: false,
	restarted: false,
};

export const start = async (area: HTMLElement): Promise<void> => {
	const preLogin = await startPreLogin(area, state);

	if (!preLogin) {
		return;
	}

	const {spinner, loggedView, setError} = preLogin;

	const user = await loadUserForView(
		state,
		(error) => {
			setDisplayStyle(spinner, 'none');
			setDisplayStyle(loggedView, 'block');

			setError(error);
		},
		() => {
			triggerPromise(start(area));
		},
	);

	if (!user) {
		return;
	}

	await startPostLogin(area, state, preLogin, user, start);
};
