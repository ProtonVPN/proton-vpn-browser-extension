import {getCountryFlag} from '../tools/getCountryFlag';
import type {Logical} from '../vpn/Logical';
import {connectionAttributes} from './connectionButton';
import {upgradeButton} from './upgradeButton';
import {c} from '../tools/translate';
import {isGroupUp, serverGroup} from './serverGroup';
import type {CountryItem} from './countryList';
import {hasSearchScore} from '../vpn/hasSearchScore';
import {needUpgrade} from '../vpn/needUpgrade';
import {expandButton} from './expendButton';
import {paidOnly, simplifiedUi} from '../config';
import {maintenanceIcon} from '../tools/maintenanceIcon';
import {upgradeAttributes} from '../account/upgradeAttributes';
import {via} from './via';

export const countryBlock = (
	userTier: number,
	code: string,
	group: CountryItem,
	predicate: (servers: Logical[]) => Logical[],
	secureCore: boolean,
	extraConnectionAttributes: Record<string, string | number> = {},
	showFlagOnGroups = false,
) => {
	const upgradeNeeded = needUpgrade(userTier, group);
	const id = `expand-${code}-${`${Math.random()}`.substring(2)}`;
	const up = isGroupUp(group);
	const exitCountryName = group.name;
	const grayOutButton = simplifiedUi && userTier <= 0;
	const canConnect = up && (simplifiedUi ? (userTier > 0) : !upgradeNeeded);
	const open = hasSearchScore(group);
	const sectionBuilder = ((window as any).sectionBuilder || ((window as any).sectionBuilder = {}));
	sectionBuilder[id] = () => serverGroup(userTier, code, group, predicate, secureCore, showFlagOnGroups);

	return `
	<div class="country-block">
		<div class="details-box ${open ? ' details-box-open' : ''}">
			<div class="details-box-summary connection-button-container">
				<div class="country-header list-item-box${grayOutButton ? ' gray-out' : ''}">
					<button
						class="flex flex-1 text-left connect-option${canConnect ? ' connect-clickable' : ''}"
						title="${c('Action: Country-level button').t`Connect to ${exitCountryName}`}"
						${up ? (canConnect ? connectionAttributes({
							...extraConnectionAttributes,
							exitCountry: code,
						}) : upgradeAttributes) : ''}
					>
						<div class="country-flag">
							${secureCore ? via() : ''}
							${getCountryFlag(code)}
						</div>
						<div class="country-name" data-country-code="${code}">
							${exitCountryName}
						</div>
						<div class="flex-1 connect-text">
							${canConnect ? c('Action').t`Connect` : ''}
						</div>
					</button>
					<div class="button-box">
						${up ? ((simplifiedUi && userTier <= 0) || (!paidOnly && upgradeNeeded)
							? upgradeButton()
							: '' // connectionButton({exitCountry: code})
						) : maintenanceIcon}
						${expandButton(
							{
								exitCountry: code,
								upgradeNeeded: upgradeNeeded ? 1 : 0,
								expand: id,
							},
						secureCore
								? /*
								translator: exitCountryName is the exit of a Secure-Core entry-exit pair: "Germany", "United States", "Sweden"
								*/ c('Action').t`Select entry country with exit in ${exitCountryName}`
								: /*
								translator: exitCountryName is the country user is about to connect to: "Germany", "United States", "Sweden"
								*/ c('Action').t`Select a city in ${exitCountryName}`,
						)}
					</div>
				</div>
			</div>
			<div
				class="details-box-body servers-list"
				id="${id}"
			></div>
		</div>
	</div>
	`;
};
