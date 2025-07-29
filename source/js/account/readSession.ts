import {Session} from './Session';
import {sessionDataStorageType, storage} from '../tools/storage';
import {triggerPromise} from '../tools/triggerPromise';
import {getKeys} from '../tools/getKeys';

export const storedSession = storage.item<Session>('session', sessionDataStorageType);

export const persistentlyStoredSession = storage.item<Session>('session');

export const readSession = async () => {
	const ephemeralSession = await storedSession.load();

	if (ephemeralSession && getKeys(ephemeralSession).length) {
		return ephemeralSession;
	}

	const persistentlySession = await persistentlyStoredSession.load();

	if (persistentlySession) {
		triggerPromise(storedSession.set(persistentlySession));
	}

	return persistentlySession;
};
