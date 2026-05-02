import {c, getCountryNameOrCode} from '../tools/translate';
import {getCountryFlag} from '../tools/getCountryFlag';
import {via} from './via';
import {escapeHtml} from '../tools/escapeHtml';
import {connectionAttributes, describeButton} from './connectionButton';
import {Feature} from '../vpn/Feature';
import type {CountryItem, CountryList} from './countryList';
import type {Choice} from '../vpn/lastChoice';
import type {Logical} from '../vpn/Logical';

const getLogicalFromItem = (
	item: CountryItem,
	id: Logical['ID'],
): Logical | undefined => {
	const logicals = item.logicals ?? [];

	for (let i = 0; i < logicals.length; i++) {
		const logical = logicals[i]!;

		if (logical.ID === id) {
			return logical;
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	return item.groups ? getLogicalById(item.groups, id) : undefined;
};

const getLogicalById = (
	countries: CountryList,
	id: Logical['ID'],
): Logical | undefined => {
	const items = Object.values(countries);

	for (let i = 0; i < items.length; i++) {
		const logical = getLogicalFromItem(items[i]!, id);

		if (logical) {
			return logical;
		}
	}

	return undefined;
};

const getCountryBlock = (choice: Choice) => {
	if (!choice.exitCountry) {
		return `
			${(choice.requiredFeatures ?? 0) & Feature.SECURE_CORE ? `<div class="via-box">${via()}</div>` : ''}
			<div class="lightning">
				<svg class="lightning-symbol" viewBox="0 0 10 14">
					<use xlink:href="img/icons.svg#lightning"></use>
				</svg>
			</div>
		`;
	}

	if (choice.entryCountry && choice.entryCountry !== choice.exitCountry) {
		return `<div class="country-flag">
			${getCountryFlag(choice.entryCountry)}
			${via()}
			${getCountryFlag(choice.exitCountry)}
		</div>`;
	}

	return `<div class="country-flag">
		${(choice.requiredFeatures ?? 0) & Feature.SECURE_CORE ? via() : ''}
		${getCountryFlag(choice.exitCountry)}
	</div>`;
};

const getButtonBox = (choice: Choice) => `<div class="button-box">
	<button
		${describeButton(c('Action').t`Remove`)}
		class="remove-recent-button"
		data-forget-recent="${escapeHtml(JSON.stringify(choice))}"
	>
		<svg width="24" height="24" viewBox="0 0 24 24">
			<use xlink:href="img/icons.svg#close-button"></use>
		</svg>
	</button>
</div>`;

const formatChoice = (countries: CountryList) => (choice: Choice) => {
	if (choice.logicalId) {
		const logical = getLogicalById(countries, choice.logicalId);

		if (!logical) {
			return `<div class="server-type list-item-box gray-out recent-block">
				<button
					disabled
					class="flex flex-1 text-left connect-option gray-out"
				>
					${getCountryBlock(choice)}
					<div class="flex-1 server-name recent-name">
						${c('Info').t`Retired server`}
					</div>
				</button>
				${getButtonBox(choice)}
			</div>`;
		}

		const escapedId = escapeHtml(`${choice.logicalId}`);

		return `<div class="server-type list-item-box recent-block">
			<button
				class="flex flex-1 text-left button-light-hover connect-option connect-clickable"
				${describeButton(c('Action: Country-level button').t`Connect to ${logical.Name}`)}
				data-id="${escapedId}"
			>
				${getCountryBlock({
					entryCountry: logical.EntryCountry,
					exitCountry: logical.ExitCountry,
					...choice,
				})}
				<div class="flex-1 server-name recent-name" data-server-id="${escapedId}">
					${escapeHtml(logical.Name)}
				</div>
				<div class="flex-1 connect-text">
					${c('Action').t`Connect`}
				</div>
			</button>
			${getButtonBox(choice)}
		</div>`;
	}

	if (choice.city) {
		const country = choice.exitCountry || '';
		const escapedCity = escapeHtml(choice.city);
		const cityName =
			countries[country]?.groups?.[choice.city]?.name ?? choice.city;

		return `<div class="server-type list-item-box recent-block">
			<button
				class="flex flex-1 text-left group-button button-light-hover connect-option connect-clickable"
				${describeButton(c('Action: City-level button').t`Connect to ${cityName}`)}
				${connectionAttributes(choice)}
				data-subGroup="${escapedCity}"
				data-no-sc-filter="1"
			>
				${getCountryBlock(choice)}
				<div
					class="flex-1 group-name recent-name"
					data-country-code="${country}"
					data-english-city-name="${escapedCity}"
				>
					${escapeHtml(cityName)}
				</div>
				<div class="flex-1 connect-text">
					${c('Action').t`Connect`}
				</div>
			</button>
			${getButtonBox(choice)}
		</div>`;
	}

	if (choice.exitCountry) {
		const countryName = getCountryNameOrCode(choice.exitCountry);

		return `<div class="server-type list-item-box recent-block">
			<button
				class="flex flex-1 text-left button-light-hover connect-option connect-clickable"
				${describeButton(c('Action: Country-level button').t`Connect to ${countryName}`)}
				${connectionAttributes(choice)}
				data-no-sc-filter="1"
			>
				${getCountryBlock(choice)}
				<div class="flex-1 country-name recent-name" data-country-code="${choice.exitCountry}">
					${escapeHtml(countryName)}
				</div>
				<div class="flex-1 connect-text">
					${c('Action').t`Connect`}
				</div>
			</button>
			${getButtonBox(choice)}
		</div>`;
	}

	const mode = (() => {
		if (choice.pick === 'random') {
			return c('Title').t`Random server`;
		}

		if (choice.pick === 'closest') {
			return c('Title').t`Closest server`;
		}

		return c('Title').t`Fastest server`;
	})();

	return `<div class="server-type list-item-box recent-block">
		<button
			class="flex flex-1 text-left button-light-hover connect-option connect-clickable"
			${describeButton(c('Action: Country-level button').t`Connect to "${mode}"`)}
			${connectionAttributes({pick: 'fastest', ...choice})}
		>
			${getCountryBlock(choice)}
			<div class="flex-1 group-name recent-name">
				${mode}
			</div>
			<div class="flex-1 connect-text">
				${c('Action').t`Connect`}
			</div>
		</button>
		${getButtonBox(choice)}
	</div>`;
};

export const recentLocations = (choices: Choice[], countries: CountryList) => {
	if (choices.length < 1) {
		return '';
	}

	return `
		<div class="servers-group group-section">${
			/* translator: caption above the list of recent countries/cities/servers the user last connected to */
			c('Title').t`Recents`
		}</div>
		<div class="servers-group recents-block">
			${choices.map(formatChoice(countries)).join('')}
		</div><div style="margin-bottom: 1em;"></div>
	`;
};

export const recentLocationsSlot = (
	choices: Choice[],
	countries: CountryList,
) => {
	return `<div class="recent-locations-slot">
		${recentLocations(choices, countries)}
	</div>`;
};
