export const getNavigator = ():
	(Navigator & {userLanguage?: string}) | undefined =>
	(global || window).navigator;
