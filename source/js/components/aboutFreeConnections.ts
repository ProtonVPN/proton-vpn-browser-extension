import {c} from '../tools/translate';
import {getCountryFlag} from '../tools/getCountryFlag';

const getCountryFlagGroup = (countries: string[]): string => {
	return countries
		.map(
			(country, index) => `
				<span class="country-in-group${country !== countries[0] ? ' folded' : ''}" style="z-index: ${3 - index}">${getCountryFlag(
					country,
				)}</span>`,
		)
		.join('');
};

export const aboutFreeConnections = (freeCountriesList: string[]) => `
	<div class="current-server-description">
		<div class="lightning">
			<svg class="lightning-symbol" viewBox="0 0 10 14">
				<use xlink:href="img/icons.svg#lightning"></use>
			</svg>
		</div>
		<div class="fastest-server" data-go-to="about-free-connections">
			<div class="current-server-country">${c('Info').t`Fastest free server`}</div>
			<div class="current-server-name">
				<span class="auto-select-label">${c('Info').t`Auto-selected from`}</span>
				<span>
				${
					freeCountriesList.length <= 3
						? getCountryFlagGroup(freeCountriesList)
						: getCountryFlagGroup(freeCountriesList.slice(0, 3)) +
							' +' +
							(freeCountriesList.length - 3)
				}
				</span>
			</div>
		</div>
	</div>
`;
