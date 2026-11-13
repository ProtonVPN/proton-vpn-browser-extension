'use popup';
import {
	autoConnectEnabled,
	secureCoreEnabled,
	secureCoreQuickButtonEnabled,
	splitTunnelingEnabled,
} from '../../config';
import {each} from '../../tools/each';

export const displayFeatureBlocks = (area: HTMLElement) => {
	each(
		{
			'.secure-core-action-block': !secureCoreEnabled,
			'.secure-core-container': !(
				secureCoreEnabled && secureCoreQuickButtonEnabled
			),
			'.split-tunneling-action-block': !splitTunnelingEnabled,
			'.auto-connect-action-block': !autoConnectEnabled,
		},
		(selector, condition) => {
			if (condition) {
				area.querySelectorAll<HTMLDivElement>(selector).forEach((element) => {
					element.style.display = 'none';
				});
			}
		},
	);
};
