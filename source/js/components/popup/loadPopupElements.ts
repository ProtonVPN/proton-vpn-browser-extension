'use popup';
export const loadPopupElements = (area: HTMLElement) => ({
	// Load unique DOM elements
	serverStatusSlot: area.querySelector<HTMLDivElement>(
		'#status .connection-status',
	)!,
	signOutButton: area.querySelector<HTMLButtonElement>(
		'button.sign-out-button',
	)!,
	switchButton: area.querySelector<HTMLButtonElement>(
		'button.switch-account-button',
	)!,
	menu: area.querySelector<HTMLDivElement>('#menu')!,
	quickConnectButton: area.querySelector<HTMLButtonElement>(
		'.quick-connect-button',
	)!,
	disconnectButton: area.querySelector<HTMLButtonElement>(
		'#status button.disconnection-button',
	)!,

	freeCountriesListEl: area.querySelector<HTMLDivElement>(
		'#free-countries-list',
	)!,
	freeCountriesCountEl: area.querySelector<HTMLSpanElement>(
		'#free-server-countries-count',
	)!,
	freeCountriesDescriptionEl: area.querySelector<HTMLSpanElement>(
		'#free-server-description',
	)!,
	freeCountryItemTemplate: area.querySelector<HTMLTemplateElement>(
		'#free-country-item-template',
	)!,
});
