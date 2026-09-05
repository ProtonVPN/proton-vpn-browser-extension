import {requireUser} from '../requireUser';
import {RefreshTokenError} from '../RefreshTokenError';
import {type ApiError, isUnauthorizedError} from '../../api';
import {saveSession} from '../saveSession';

export const loadUserForView = async (
	state: {
		restarted: boolean;
	},
	reject: (error: ApiError) => void,
	restart: () => void,
) => {
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

		reject(e as ApiError);

		return undefined;
	}
};
