import type {Logical} from './Logical';
import {Feature} from './Feature';

export const filterLogicalsWithCurrentFeatures = (
	rawLogicals: Logical[],
	userTier: number,
	secureCore: {value: boolean} | undefined,
	withTor = false,
) => rawLogicals.filter(
	logicial => (logicial.Features & ((withTor ? 0 : Feature.TOR) | Feature.RESTRICTED | Feature.PARTNER)) === 0 &&
		(!secureCore || (logicial.Features & Feature.SECURE_CORE) === (userTier > 0 && secureCore.value ? Feature.SECURE_CORE : 0))
);
