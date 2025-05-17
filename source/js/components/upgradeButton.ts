import {upgradeAttributes} from '../account/upgradeAttributes';

export const upgradeButton = (
	extraClasses: string[] = [],
) => `<button class="upgrade-button ${extraClasses.join(' ')}" ${upgradeAttributes}>
	<img loading="lazy" src="img/vpn-plus.svg" alt="Proton VPN" width="33" height="20">
</button>`;
