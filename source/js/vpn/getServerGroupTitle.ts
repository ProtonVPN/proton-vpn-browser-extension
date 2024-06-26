import {c} from '../tools/translate';

export function getServerGroupTitle(tier: any, count: number|null|undefined): string {
	count || (count = 0);

	if (typeof tier !== 'number' || tier < 1) {
		return c('Label').t`Free servers (${count})`;
	}

	if (tier <= 2) {
		return  c('Label').t`Plus servers (${count})`;
	}

	return c('Label').t`Internal servers (${count})`;
}
