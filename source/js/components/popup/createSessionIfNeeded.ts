'use popup';
import type {Session} from '../../account/Session';
import {createSession} from '../../account/createSession';
import {warn} from '../../log/log';

export const createSessionIfNeeded = async (
	area: HTMLElement,
	session: Session,
): Promise<boolean> => {
	if (!session.uid || !session.refreshToken) {
		try {
			if (!(await createSession(area, session))) {
				return false;
			}
		} catch (e) {
			warn(e);
		}
	}

	return true;
};
