import {getPmUserFromBackground} from './getPmUserFromBackground';
import {getRegisteredLocaleFromUser} from './getRegisteredLocaleFromUser';

const fetchUser = async () => {
	try {
		// Short timeout so if it's not yet in cache, we let it load in the background,
		// but we skip it for language so the UI is not waiting
		return await getPmUserFromBackground(200);
	} catch {
		return undefined;
	}
};

export const getRegisteredLocale = async () => {
	return getRegisteredLocaleFromUser(await fetchUser());
};
