import type {ProxyServer} from '../vpn/ConnectionState';
import {buttonMatchesSecureCore} from './buttonMatchesSecureCore';

const isConnectedToSecureCore = (
	server: ProxyServer | undefined,
	isSecureCoreEnabled: () => boolean,
) => {
	const exitCountry = server?.exitCountry;

	if (exitCountry) {
		const entryCountry = server!.entryCountry;

		return entryCountry !== exitCountry;
	}

	return isSecureCoreEnabled();
};

export const showConnectedItemMarker = (
	area: HTMLElement,
	connected: boolean,
	server: ProxyServer | undefined,
	isSecureCoreEnabled: () => boolean,
) => {
	const exitCountry = server?.exitCountry;
	const exitEnglishCity = server?.exitEnglishCity;
	const id = server?.id;

	area.querySelectorAll<HTMLDivElement>('.country-name').forEach((nameSlot) => {
		const currentCode = nameSlot.getAttribute('data-country-code');

		nameSlot.classList[
			connected &&
			currentCode &&
			currentCode === exitCountry &&
			buttonMatchesSecureCore(
				nameSlot,
				isSecureCoreEnabled(),
				isConnectedToSecureCore(server, isSecureCoreEnabled),
			)
				? 'add'
				: 'remove'
		]('connected-list-item');
	});

	area
		.querySelectorAll<HTMLDivElement>('.group-button')
		.forEach((groupSlot) => {
			const subGroup = groupSlot.getAttribute('data-subGroup');
			const groupExitCountry = groupSlot.getAttribute('data-exitCountry');
			const match =
				connected &&
				subGroup &&
				groupExitCountry &&
				subGroup === exitEnglishCity &&
				groupExitCountry === exitCountry;

			groupSlot
				.querySelectorAll<HTMLDivElement>('.group-name')
				.forEach((nameSlot) => {
					nameSlot.classList[match ? 'add' : 'remove']('connected-list-item');
				});
		});

	area.querySelectorAll<HTMLDivElement>('.server-name').forEach((nameSlot) => {
		nameSlot.classList[
			connected && id && nameSlot.getAttribute('data-server-id') === id
				? 'add'
				: 'remove'
		]('connected-list-item');
	});
};
