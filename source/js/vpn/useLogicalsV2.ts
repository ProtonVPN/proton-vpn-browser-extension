import {getFeatureFlag} from '../featureFlag/getFeatureFlag';

// TODO(VPNCORE-198) Remove useLogicalsV2 and related stuff when v1 is gone
export const logicalEndpointConfig = {
	useLogicalV2: undefined as boolean | undefined,
};

export const useLogicalsV2 = (() => {
	return async () => {
		if (typeof logicalEndpointConfig.useLogicalV2 !== 'boolean') {
			logicalEndpointConfig.useLogicalV2 =
				await getFeatureFlag('BinaryServerStatus');
		}

		return logicalEndpointConfig.useLogicalV2;
	};
})();
