import type {Logical} from './Logical';
import {Feature} from './Feature';

export const getSecureCorePredicate = (userTier: number, secureCore: {value: boolean}) => (
	(logical: Logical) => ((logical.Features & Feature.SECURE_CORE) !== 0) === (userTier > 0 && secureCore.value)
);
