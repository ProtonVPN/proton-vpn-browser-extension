import type {Logical} from './Logical';
import type {CountryItem} from '../components/countryList';

export const needUpgrade = (userTier: number, servers: Logical[] | CountryItem): boolean => {
	if (('logicals' in servers) && servers.logicals?.length && !needUpgrade(userTier, servers.logicals)) {
		return false;
	}

	if (('groups' in servers)) {
		const groups = Object.values(servers.groups || {});

		if (groups.length && !groups.every(group => needUpgrade(userTier, group))) {
			return false;
		}
	}

	if (typeof (servers as Logical[]).every === 'function' && (servers as Logical[]).length) {
		return (servers as Logical[]).every(server => userTier < server.Tier);
	}

	return true;
};
