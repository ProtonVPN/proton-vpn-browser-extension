'use background';
import type {Logical} from './Logical';
import type {Server} from './Server';
import type {UserContext} from '../account/user/UserContext';
import {getSortedLogicals} from './getLogicals';
import {Feature} from './Feature';
import {getBestLogical} from './getLogical';
import {pickServerInLogical} from './pickServerInLogical';
import type {ConnectionState} from './ConnectionState';

type SelectionCriteria = Pick<Logical, 'Tier'> &
	Partial<Pick<Logical, 'Features' | 'ExitCountry'>>;

const getAlternativeServerForLogical = async (
	logicals: Logical[],
	id: string | number,
	current: SelectionCriteria,
	userContext: UserContext,
): Promise<{
	logical?: Logical | undefined;
	server?: Server | undefined;
}> => {
	const currentFeatures = current.Features;
	const filters = [
		(logical: Logical) => logical.ID !== id,
		(logical: Logical) => logical.Tier <= current.Tier,
		typeof currentFeatures === 'number'
			? (logical: Logical) =>
					(logical.Features & Feature.SECURE_CORE) ===
					(currentFeatures & Feature.SECURE_CORE)
			: null,
		current.ExitCountry
			? (logical: Logical) => logical.ExitCountry === current.ExitCountry
			: null,
		typeof currentFeatures === 'number'
			? (logical: Logical) =>
					logical.Features === (currentFeatures & ~Feature.RESTRICTED)
			: null,
	].filter((v) => v !== null);

	while (filters.length > 2) {
		const alternative = getBestLogical(
			logicals.filter((logical) => filters.every((filter) => filter(logical))),
			userContext,
		);

		if (alternative) {
			return {
				logical: alternative,
				server: pickServerInLogical(alternative),
			};
		}

		filters.pop();
	}

	return {server: undefined, logical: undefined};
};

const getCurrentServerCriteria = (
	currentState?: ConnectionState,
): SelectionCriteria | undefined => {
	const server = currentState?.data.server;

	if (!server) {
		return undefined;
	}

	return {
		Tier: server.name?.toLowerCase()?.includes('free') ? 0 : 2,
		ExitCountry: server.exitCountry,
		...(typeof server.secureCore === 'undefined'
			? {}
			: {
					Features: server.secureCore ? Feature.SECURE_CORE : 0,
				}),
	};
};

export const getAlternativeServer = async (
	id: string | number,
	userContext: UserContext,
	guessCurrentLogicalIfIdNotFound?: (
		logicals: Logical[],
	) => Promise<SelectionCriteria | undefined>,
	getCurrentState?: () => ConnectionState,
): Promise<{
	logical?: Logical | undefined;
	server?: Server | undefined;
}> => {
	const logicals = await getSortedLogicals();
	const current =
		logicals.find((logical) => logical.ID === id) ??
		(await guessCurrentLogicalIfIdNotFound?.(logicals)) ??
		getCurrentServerCriteria(getCurrentState?.());

	return current
		? getAlternativeServerForLogical(logicals, id, current, userContext)
		: {};
};
