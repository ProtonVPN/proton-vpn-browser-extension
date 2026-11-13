'use popup';
import type {Logical} from './Logical';

export const excludeLogicalsFromCurrentCountry = (
	rawLogicals: Logical[],
	/** e.g. 'JP' | 'US' */
	exitCountry?: Logical['ExitCountry'],
) => rawLogicals.filter((logical) => logical.ExitCountry !== exitCountry);
