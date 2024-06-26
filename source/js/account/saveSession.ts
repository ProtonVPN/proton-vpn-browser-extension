import {Session} from './Session';
import {triggerPromise} from '../tools/triggerPromise';
import {persistentlyStoredSession, readSession, storedSession} from './readSession';
import {removeCredentials} from './credentials/removeCredentials';

export const saveSession = async (session: Session): Promise<void> => {
	const previousUid = (await readSession())?.uid;
	const newUid = session?.uid || previousUid;

	triggerPromise(session.persistent
		? persistentlyStoredSession.set(session)
		: persistentlyStoredSession.remove()
	);

	await storedSession.set(session);

	if (newUid !== previousUid) {
		await removeCredentials();
	}
};
