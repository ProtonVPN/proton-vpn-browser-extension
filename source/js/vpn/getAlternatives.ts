import {Logical} from './Logical';
import {Server} from './Server';
import {getSortedLogicals} from './getLogicals';
import {Feature} from './Feature';
import {getBestLogical} from './getLogical';
import {pickServerInLogical} from './pickServerInLogical';

export const getAlternativeServer = async (id: string | number, userTier: number): Promise<{
	logical?: Logical | undefined;
	server?: Server | undefined;
}> => {
	const logicals = await getSortedLogicals();
	const current = logicals.find(logical => logical.ID === id);

	if (!current) {
		return {};
	}

	const filters = [
		(logical: Logical) => logical.ID !== id,
		(logical: Logical) => logical.Tier <= current.Tier,
		(logical: Logical) => (logical.Features & Feature.SECURE_CORE) === (current.Features & Feature.SECURE_CORE),
		(logical: Logical) => logical.ExitCountry === current.ExitCountry,
		(logical: Logical) => logical.Features === (current.Features & ~Feature.RESTRICTED),
	];

	while (filters.length > 2) {
		const alternative = getBestLogical(logicals.filter(
			logical => filters.every(filter => filter(logical)),
		), userTier);

		if (alternative) {
			return {
				logical: alternative,
				server: pickServerInLogical(alternative),
			};
		}

		filters.pop();
	}

	return { server: undefined, logical: undefined };
};
