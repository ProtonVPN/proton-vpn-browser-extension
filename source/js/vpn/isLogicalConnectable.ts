import {torEnabled} from '../config';
import {Feature} from './Feature';
import type {Logical} from './Logical';

/** Remove when/if TOR/B2B will be supported */
const getUnsupportedFeatures = () => (torEnabled ? 0 : Feature.TOR) | Feature.RESTRICTED;

/** Only servers up to tier 2 support HTTP proxy */
const isLogicalAuthorized = (logical: Logical) => {
	return logical.Tier <= ((global as any).logicalMaxTier || 2);
};

const isLogicalSupported = (logical: Logical) => {
	return (logical.Features & getUnsupportedFeatures()) === 0;
};

export const isLogicalConnectable = (
	logical: Logical,
) => isLogicalAuthorized(logical) && isLogicalSupported(logical);
