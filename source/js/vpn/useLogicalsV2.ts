import {getFeatureFlag} from '../featureFlag/getFeatureFlag';

/**
 * Name of the toggle enabling the faster logicals v2 API.
 *
 * When the toggle is unknown to the API, `getFeatureFlag()` returns `false` and
 * the extension keeps using logicals v1, which is the safe behaviour.
 */
const logicalsV2FeatureFlag = 'BexLogicalsV2';

export const useLogicalsV2 = (): Promise<boolean> =>
	getFeatureFlag(logicalsV2FeatureFlag);
