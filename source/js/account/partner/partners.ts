interface PartnerParameters {
	id: string;
	welcomePage?: string;
}

interface PartnerConfig extends PartnerParameters {
	name: string;
}

export const partners: Record<string, PartnerParameters> = {
	vivaldi: {
		id: '4',
		welcomePage: 'https://vivaldi.com/protonvpn/welcome/',
	},
};

const getPartnersByIds = ((
	partnersById: Record<string, PartnerConfig> | undefined,
) => {
	return (): Record<string, PartnerConfig> => {
		if (!partnersById) {
			partnersById = {};

			for (const name in partners) {
				const parameters = partners[name]!;
				partnersById[`${parameters.id}`] = {name, ...parameters};
			}
		}

		return partnersById;
	};
})(undefined);

export const getPartnerById = (
	id: string | number,
): PartnerConfig | undefined => {
	return getPartnersByIds()[`${id}`];
};
