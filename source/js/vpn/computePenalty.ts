const PARTIAL_SCORE_CEILING = 0.99;

const normalizeCountry = (country: string) => {
	const code = country.toUpperCase();

	return code === 'UK' ? 'GB' : code;
};

const isUserInServerCountry = (
	serverCountry: string,
	userCountry: string | undefined,
) =>
	userCountry &&
	normalizeCountry(userCountry) === normalizeCountry(serverCountry);

export const computePenalty = (
	visible: boolean,
	enabled: boolean,
	serverCapacity: number,
	cost: number,
	penalty: number,
	serverCountry: string,
	userCountry: string | undefined,
) => {
	const inSameCountry = isUserInServerCountry(serverCountry, userCountry);

	return (
		penalty +
		(visible && enabled ? 0 : 1000) +
		(inSameCountry && serverCapacity < PARTIAL_SCORE_CEILING ? 0 : 1) +
		(!inSameCountry && cost >= 1 ? 3 : 0)
	);
};
