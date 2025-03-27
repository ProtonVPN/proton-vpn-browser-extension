import {fetchJson} from '../../api';
import {Session} from '../Session';
import {Storage, storage} from '../../tools/storage';
import {triggerPromise} from '../../tools/triggerPromise';

const root = global || window;
root.browser || ((root as any).browser = chrome);

interface ConsumeForkResponse {
	UID: string;
	AccessToken: string;
	RefreshToken: string;
}

export const consumeFork = async ({state, selector}: {
	state: string;
	selector: string;
}): Promise<{ session: Session, forkState: ForkState }> => {
	const stateKey = `f${state}`;
	const maybeStoredState: ForkState | undefined = await storage.getItem(
		stateKey,
		undefined,
		Storage.LOCAL,
	);

	if (!maybeStoredState) {
		throw new Error('Invalid state');
	}

	triggerPromise(storage.removeItem(stateKey));

	const {
		UID,
		AccessToken,
		RefreshToken,
	} = await fetchJson<ConsumeForkResponse>(`auth/sessions/forks/${selector}`);

	return {
		session: {
			accessToken: AccessToken,
			refreshToken: RefreshToken,
			uid: UID,
		},
		forkState: maybeStoredState
	}
};
