import {type ApiError, isUnauthorizedError} from '../../api';
import {RefreshTokenError} from '../RefreshTokenError';
import {requireUser} from '../requireUser';
import {saveSession} from '../saveSession';
import type {User} from './User';

/**
 * Get the user the popup needs to render, or handle the failure to get one.
 *
 * When the session can no longer be used, it's dropped and `restart` is called
 * so the popup starts over on the signing view; any other error is passed to
 * `onError` so it can be displayed. Both cases return `undefined`, meaning the
 * caller has nothing to render.
 */
export const loadUserForView = async (
	state: {restarted: boolean},
	onError: (error: ApiError) => void,
	restart: () => void,
): Promise<User | undefined> => {
	try {
		return await requireUser();
	} catch (e) {
		if (
			e instanceof RefreshTokenError ||
			(e as RefreshTokenError).logout ||
			(!state.restarted && isUnauthorizedError(e))
		) {
			state.restarted = true;
			await saveSession({});

			restart();

			return undefined;
		}

		onError(e as ApiError);

		return undefined;
	}
};
