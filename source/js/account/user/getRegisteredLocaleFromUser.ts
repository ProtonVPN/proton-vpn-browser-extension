import type {PmUser} from './PmUser';

export const getRegisteredLocaleFromUser = (user: PmUser | undefined) => {
	const config = user?.Locale;

	if (!config) {
		return undefined;
	}

	const {Locale: locale, HasRegisteredLocale: localeRegistered} = config;

	return (localeRegistered && locale) || undefined;
};
