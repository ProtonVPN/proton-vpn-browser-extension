enum UserTier {
	NON_USER = 'non_user',
	FREE = 'free',
	PAID = 'paid',
	INTERNAL = 'internal',
	//CREDENTIAL_LESS = 'credential_less', NOT AVAILABLE IN BEX
	NOT_AVAILABLE = 'n/a',
}

export const planTierDimensionMapper = (tier: number | undefined) => {
	switch (tier) {
		case undefined:
			return UserTier.NON_USER;
		case 0:
			return UserTier.FREE;
		case 1:
		case 2:
			return UserTier.PAID;
		case 3:
			return UserTier.INTERNAL;
		default:
			return UserTier.NOT_AVAILABLE;
	}
};
