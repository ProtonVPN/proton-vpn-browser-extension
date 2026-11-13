import {upgradeAttributes} from '../account/upgradeAttributes';
import {c} from '../tools/translate';

export const upgradeButton = (
	extraClasses: string[] = [],
) => `<button class="upgrade-button ${extraClasses.join(' ')}" ${upgradeAttributes}>
	<img loading="lazy" src="img/vpn-plus.svg" alt="${c('Action').t`Upgrade to Proton VPN Plus`.replace(/"/g, "'")}" width="33" height="20">
</button>`;

export const replaceWithUpgradeButton = (button: Node) => {
	const div = document.createElement('div');
	// nosemgrep:insecure-innerhtml
	div.innerHTML = upgradeButton();
	button.parentNode?.replaceChild(div, button);
};
