import type {PmUser} from '../account/user/PmUser';
import {getBrowser} from './getBrowser';
import {getFullAppVersion} from '../config';
import {warn} from '../log/log';
import {getPmUserFromPopup} from '../account/user/getPmUserFromPopup';

type PmUserGetter = () => Promise<PmUser|undefined>;

const getPmUserValue = async (pmUserGetter: PmUserGetter, key: string, pmUserKey: keyof PmUser): Promise<readonly [string, string]|null> => {
	const value = (await pmUserGetter())?.[pmUserKey] as string | undefined;

	return value ? [key, value] : null;
};

const getPrefillEntries = async (
	pmUserGetter: PmUserGetter,
	fieldsToSeed: string[],
) => (await Promise.all(fieldsToSeed.map(async (key): Promise<readonly [string, string|number]|null> => {
	switch (key) {
		case 'platform':
			return [key, `VPN for ${getBrowser().name}`];

		case 'clientVersion':
			return [key, getFullAppVersion() + '+' + getBrowser().type];

		case 'username':
			return await getPmUserValue(pmUserGetter, key, 'Name');

		case 'email':
			return await getPmUserValue(pmUserGetter, key, 'Email');
	}

	warn('Unknown key ' + key);

	return null;
}))).filter(Boolean) as (readonly [string, string|number])[];

export const getPrefillValues = async (
	fieldsToSeed: string[],
	pmUserGetter?: PmUserGetter,
): Promise<Record<string, string|number>> => {
	if (!fieldsToSeed.length) {
		return {};
	}

	return Object.fromEntries(await getPrefillEntries(pmUserGetter || getPmUserFromPopup, fieldsToSeed));
};
