import {upgradeAttributes} from '../account/upgradeAttributes';
import {c} from '../tools/translate';

export const upgradeButton = (
	extraClasses: string[] = [],
) => `<button class="upgrade-button ${extraClasses.join(' ')}" ${upgradeAttributes}>
	<img loading="lazy" src="img/vpn-plus.svg" alt="${(c('Action').t`Upgrade to Proton VPN Plus`).replace(/"/g, "'")}" width="33" height="20">
</button>`;
