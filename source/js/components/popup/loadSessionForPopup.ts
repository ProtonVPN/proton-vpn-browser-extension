'use popup';
import type {PmUser} from '../../account/user/PmUser';
import {readSession} from '../../account/readSession';
import {registerLocale} from '../../tools/locale';
import {getRegisteredLocaleFromUser} from '../../account/user/getRegisteredLocaleFromUser';

export const loadSessionForPopup = async (
	getPmUser: () => Promise<PmUser | undefined>,
) => {
	const session = await readSession();

	if (session.uid) {
		try {
			registerLocale(getRegisteredLocaleFromUser(await getPmUser()));
		} catch {
			// Fallback to browser locale
		}
	}

	return session;
};
