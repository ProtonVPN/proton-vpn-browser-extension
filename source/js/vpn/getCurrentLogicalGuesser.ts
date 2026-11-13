'use background';
import {getLastChoice, getLogicalsFilteredByChoice} from './lastChoice';
import type {UserContext} from '../account/user/UserContext';
import type {Logical} from './Logical';
import {getBestLogical} from './getLogical';

export const getCurrentLogicalGuesser =
	(userContext: UserContext) =>
	async (logicals: Logical[]): Promise<Logical | undefined> => {
		const choice = await getLastChoice();

		if (!choice.connected) {
			return undefined;
		}

		return getBestLogical(
			getLogicalsFilteredByChoice(logicals, choice),
			userContext,
		);
	};
