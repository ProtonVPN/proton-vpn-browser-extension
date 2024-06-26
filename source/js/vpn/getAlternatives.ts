import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {Logical} from './Logical';
import {Server} from './Server';
import {getSortedLogicals} from './getLogicals';
import {Feature} from './Feature';
import {getBestLogical} from './getBestLogical';
import {warn} from '../log/log';
import {pickServerInLogical} from './pickServerInLogical';

const getAlternatives = async (id: string | number): Promise<Logical[]> => {
	try {
		const { Alternatives: alternatives } = await fetchWithUserInfo<{ Alternatives?: Logical[] }>(`vpn/v1/logicals/${id}/alternatives`)

		return alternatives || [];
	} catch (e) {
		warn(e);

		return [];
	}
};

const getAlternativeServerFromApi = async (id: string | number): Promise<{
	logical?: Logical | undefined;
	server?: Server | undefined;
}> => {
	try {
		const alternatives = await getAlternatives(id);
		const length = alternatives.length;

		if (length) {
			const logical = alternatives[Math.floor(Math.random() * length)];

			return {
				logical,
				server: pickServerInLogical(logical),
			};
		}

		return {};
	} catch (e) {
		warn(e, new Error().stack);

		return {};
	}
};

export const getAlternativeServer = async (id: string | number, userTier: number): Promise<{
	logical?: Logical | undefined;
	server?: Server | undefined;
}> => {
	const { server, logical } = await getAlternativeServerFromApi(id);

	if (server && logical) {
		return { server, logical };
	}

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

	return { server, logical };
};
