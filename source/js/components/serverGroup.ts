import {serverList} from './serverList';
import type {Logical} from '../vpn/Logical';
import type {CountryItem} from './countryList';
import {getKeysAndValues} from '../tools/getKeysAndValues';
import {needUpgrade} from '../vpn/needUpgrade';
import {upgradeButton} from './upgradeButton';
import {connectionAttributes} from './connectionButton';
import {expandButton} from './expendButton';
import {c, msgid} from '../tools/translate';
import {paidOnly, simplifiedUi} from '../config';
import {getCountryFlag} from '../tools/getCountryFlag';
import {isLogicalUp} from '../vpn/getLogicals';
import {maintenanceIcon} from '../tools/maintenanceIcon';
import {upgradeAttributes} from '../account/upgradeAttributes';
import {Feature} from '../vpn/Feature';

export const formatGroup = (
	userTier: number,
	logicals: Logical[],
	secureCore: boolean,
	extraAttributes: Record<string, string | number> = {},
	skipSorting = false,
	className = '',
): string => {
	const count = logicals.length;
	const title = secureCore
		? /* translator: Header of a list of entry counties once Secure Core exit country has been selected */ c('Label').plural(
			count,
			msgid`Entry country`,
			`Entry countries`,
		) + (count > 1 ? ' (' + count + ')' : '')
		: /* translator: Header of a list of servers */ c('Label').plural(
			count,
			msgid`Server`,
			`Servers`,
		);

	return `
		<div
			class="servers-group${hasStreamingLogical(logicals) ? ' with-tooltip' : ''} ${className || 'group-logicals'}"
			${simplifiedUi && (userTier <= 0) ? upgradeAttributes : connectionAttributes(extraAttributes)}
		>
			<div class="server-type group-section">${title}</div>
			<div class="server-items">${serverList(userTier, logicals, title, secureCore, skipSorting)}</div>
		</div>
	`;
};

const getMinTier = (group: CountryItem): number => Math.min(
	(group?.logicals || []).reduce((t, l) => Math.min(t, l.Tier), 2),
	Object.values(group?.groups || {}).reduce((t, g) => Math.min(t, getMinTier(g)), 2),
);

export const torIcon = `<svg class="small-icon" viewBox="-3 -1 24 24" role="img" focusable="false">
	<use xlink:href="img/icons.svg#tor"></use>
</svg>`;

const getGroupIcon = (type: CountryItem['type'], countryCode: string): string => {
	if (type === 'tor') {
		return torIcon;
	}

	if (type === 'city') {
		return `<svg class="small-icon" viewBox="0 0 24 24" role="img" focusable="false">
			<use xlink:href="img/icons.svg#city"></use>
		</svg>`;
	}

	if (type === 'free') {
		return getCountryFlag(countryCode, true);
	}

	return `<svg class="small-icon" viewBox="0 0 24 24" role="img" focusable="false">
		<use xlink:href="img/icons.svg#server"></use>
	</svg>`;
};

export const isGroupUp = (group: CountryItem): boolean => (group.logicals || []).some(isLogicalUp)
	|| Object.values(group.groups || {}).some(isGroupUp);

const hasStreamingLogical = (logicals: Logical[]) => logicals.some(
	// TODO Use (logical.Features & Feature.STREAMING) !== 0
	// TODO once admin properly seed it
	logical => (logical.Features & (Feature.SECURE_CORE | Feature.TOR | Feature.RESTRICTED | Feature.PARTNER)) === 0,
);

const hasGroupStreaming = (group: CountryItem): boolean => hasStreamingLogical(group.logicals || [])
	|| Object.values(group.groups || {}).some(hasGroupStreaming);

const formatGroups = (
	userTier: number,
	countryCode: string,
	predicate: (servers: Logical[]) => Logical[],
	secureCore: boolean,
	upgradeNeeded: boolean,
	groups: (CountryItem | undefined)[],
	showFlag = false,
): string[] => (groups.map(
	group => (group && (Object.values(group?.groups || {}).length || group?.logicals?.length)) ? ({
		group,
		list: serverGroup(userTier, countryCode, group, predicate, secureCore, showFlag),
	}) : {},
).filter(({list}) => list) as ({group: CountryItem, list: string})[]).map(
	({group, list}) => {
		if (group.type === 'secureCore') {
			return list;
		}

		const id = `expand-${countryCode}-${`${Math.random()}`.substring(2)}`;
		const up = isGroupUp(group);
		const cityName = group.name;
		const grayOutButton = simplifiedUi && userTier <= 0;
		const subscriptionNeeded = ((simplifiedUi && userTier <= 0) || upgradeNeeded);
		const unconnectable = (subscriptionNeeded || !up);

		return `
			<div class="servers-group" data-tier="${getMinTier(group)}" data-country-code="${countryCode}">
				<div class="server-type list-item-box${grayOutButton ? ' gray-out' : ''}">
					<button
						class="flex flex-1 text-left group-button button-light-hover connect-option${unconnectable ? '' : ' connect-clickable'}${up ? '' : ' in-maintenance'}"
						title="${c('Action: City-level button').t`Connect to ${cityName}`}"
						${up ? (subscriptionNeeded ? upgradeAttributes : connectionAttributes({
							exitCountry: countryCode,
							subGroup: group.englishName,
						})) : ''}
					>
						${showFlag
							? `<div class="group-icon squeezed">${getCountryFlag(countryCode, true)}</div>`
							: `<div class="group-icon">${getGroupIcon(group.type, countryCode)}</div>`
						}
						<div class="flex-1 group-name">${cityName}</div>
						<div class="flex-1 connect-text">
							${unconnectable ? '' : c('Action').t`Connect`}
						</div>
					</button>
					<div class="button-box">
						${up ? (
							((simplifiedUi && userTier <= 0) || (!paidOnly && upgradeNeeded))
								? upgradeButton()
								: '' // connectionButton({exitCountry: code})
							)
							: maintenanceIcon
						}
						${expandButton(
							{
								exitCountry: countryCode,
								subGroup: group.englishName,
								subGroupName: group.name,
								upgradeNeeded: upgradeNeeded ? 1 : 0,
								expand: id,
							},
							c('Action').t`Select a server in ${cityName}`,
						)}
					</div>
				</div>
				<div class="servers-list" id="${id}">${list}</div>
			</div>
		`;
	},
);

const getGroupParts = (group: CountryItem): [string, (CountryItem | undefined)[]][] => {
	const groups = group.groups || {};
	const freeGroup = (groups as any).Free as CountryItem | undefined;
	const torGroup = (groups as any).Tor as CountryItem | undefined;
	const secureCoreGroup = (groups as any).SecureCore as CountryItem | undefined;
	const otherGroup = (groups as any).Other as CountryItem | undefined;
	const restGroups = getKeysAndValues(groups)
		.filter(({key}) => !({Free: true, Tor: true, SecureCore: true, Other: true})[key])
		.map(({value}) => value);

	return [
		[c('Label').t`Free servers`, [freeGroup]],
		[c('Label').t`Cities`, restGroups],
		[c('Info').t`Secure Core`, [secureCoreGroup]],
		[c('Label').t`Other`, [torGroup, otherGroup]],
	];
};

export const getServerGroups = (
	userTier: number,
	countryCode: string,
	group: CountryItem,
	predicate: (servers: Logical[]) => Logical[],
	secureCore: boolean,
	withTitle = false,
	showFlagOnGroups = false,
): string[] => {
	return getGroupParts(group).map(([section, list]) => {
		const items = list.filter(Boolean) as CountryItem[];
		const subGroups = formatGroups(
			userTier,
			countryCode,
			predicate,
			secureCore,
			items.every(g => needUpgrade(userTier, g)),
			list,
			showFlagOnGroups,
		);
		const count = subGroups.length;

		if (count < 1) {
			return '';
		}

		return (withTitle && !secureCore
			? `<div
				class="servers-group group-section${items.some(hasGroupStreaming) ? ' with-tooltip' : ''}"
				data-tier="${getMinTier(group)}"
				data-country-code="${countryCode}"
			>${section}${count > 1 ? ' (' + count + ')' : ''}</div>`
			: ''
		) + subGroups.join('');
	});
};

export const serverGroup = (
	userTier: number,
	countryCode: string,
	group: CountryItem,
	predicate: (servers: Logical[]) => Logical[],
	secureCore: boolean,
	showFlagOnGroups = false,
): string => {
	const logicals = predicate(group.logicals || []);
	const secureCoreEnabled = userTier > 0 && secureCore;

	if (logicals.length) {
		return formatGroup(
			userTier,
			logicals,
			secureCoreEnabled,
			{
				tier: logicals.reduce((t, l) => Math.min(t, l.Tier), 2),
				'country-code': countryCode,
			},
		);
	}

	return getServerGroups(userTier, countryCode, group, predicate, secureCoreEnabled, true, showFlagOnGroups).join('');
};
