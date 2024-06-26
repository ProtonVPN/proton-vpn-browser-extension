import {Logical} from '../vpn/Logical';
import {connectionAttributes, connectionButton} from './connectionButton';
import {upgradeButton} from './upgradeButton';
import {escapeHtml} from '../tools/escapeHtml';
import {getCountryFlag} from '../tools/getCountryFlag';
import {paidOnly, simplifiedUi} from '../config';
import {c} from '../tools/translate';
import {isLogicalUp} from '../vpn/getLogicals';
import {Sorter} from '../tools/comp';
import {maintenanceIcon} from '../tools/maintenanceIcon';
import {upgradeAttributes} from '../account/upgradeAttributes';
import {via} from './via';

const getLoadColor = (load: number): string => {
	if (load <= 75) {
		return '#1ea885';
	}

	if (load <= 90) {
		return '#ff9900';
	}

	return '#f7607b';
};

const getStrokeAttributes = (logical?: Logical): string => {
	const load = logical?.Load || 0;

	return `
		stroke-dasharray="${Math.round(load)}, 100"
		style="stroke: ${getLoadColor(load)}"
	`;
};

const sorter = new Sorter<Logical, Logical>(l => l)
	.asc('Score')
	.desc('Load')
	.asc('Name');

const sortByScore = (logicals: Logical[]) => {
	const sortedLogicals = logicals.slice();
	sorter.sort(sortedLogicals);

	return sortedLogicals;
};

export const serverList = (userTier: number, logicals: Logical[], upperTitle: string, secureCore: boolean) => sortByScore(logicals).map(logical => {
	const up = isLogicalUp(logical);
	const serverName = logical.Name;
	const connectionsAttributes: Record<string, string | number> = secureCore
		? {exitCountry: logical.ExitCountry, entryCountry: logical.EntryCountry}
		: {id: logical.ID};

	return `
		<div
			${up
				? `
					class="server connection-button-container"
					tabindex="0"
					role="button"
					title="${c('Action: Server-level button').t`Connect to ${serverName}`}"
					${(simplifiedUi ? (userTier <= 0) : (logical.Tier > userTier))
						? upgradeAttributes
						: connectionAttributes(connectionsAttributes)}
					`
				: `class="server in-maintenance"`
			}
		>
			<div class="load-block" title="${logical.Load}%">
				<div class="load-percentage">
					<svg aria-label="${logical.Load}%" viewBox="0 0 36 36" class="circular-chart">
						<path class="circle-bg"
							d="M18 2.0845
							  a 15.9155 15.9155 0 0 1 0 31.831
							  a 15.9155 15.9155 0 0 1 0 -31.831"
						/>
						<path class="circle"
							${getStrokeAttributes(logical)}
							d="M18 2.0845
							  a 15.9155 15.9155 0 0 1 0 31.831
							  a 15.9155 15.9155 0 0 1 0 -31.831"
						/>
					</svg>
				</div>
			</div>
			<div class="server-infos">
				<span
					class="server-name"
					data-server-id="${escapeHtml(`${logical.ID}`)}"
				>${
					secureCore
						? `<span class="country-flag">${getCountryFlag(logical.EntryCountry)}</span> ${via('top-small')} ${logical.Translations?.EntryCountryName || logical.EntryCountryName}`
						: serverName
				}</span>${
				logical.City && (logical.Translations?.City || logical.City) !== upperTitle
				? ` &nbsp; <span
					class="city-name"
					data-english-city-name="${escapeHtml(logical.City)}"
					data-country-code="${escapeHtml(logical.ExitCountry)}"
				>${
					escapeHtml(logical.Translations?.City || logical.City)
				}</span>`
				: ''
			}
			</div>
			<div class="flex-1 connect-text">
				${!up || (simplifiedUi && userTier <= 0) || logical.Tier > userTier ? '' : c('Action').t`Connect`}
			</div>
			<div class="button-box">
				${up
					? (simplifiedUi && userTier <= 0
						? upgradeButton()
						: (logical.Tier > userTier
							? (paidOnly ? '' : upgradeButton())
							: connectionButton(connectionsAttributes)
						)
					)
					: maintenanceIcon
				}
			</div>
		</div>
	`;
}).join('');
