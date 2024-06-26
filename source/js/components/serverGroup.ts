import {serverList} from './serverList';
import {Logical} from '../vpn/Logical';
import {CountryItem} from './countryList';
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
		) + (count > 1 ? ' (' + count + ')' : '');

	return `
		<div
			class="servers-group${hasStreamingLogical(logicals) ? ' with-tooltip' : ''} ${className || 'group-logicals'}"
			${simplifiedUi && (userTier <= 0) ? upgradeAttributes : connectionAttributes(extraAttributes)}
		>
			<div class="server-type group-section">${title}</div>
			<div class="server-items">${serverList(userTier, logicals, title, secureCore)}</div>
		</div>
	`;
};

const getMinTier = (group: CountryItem): number => Math.min(
	(group?.logicals || []).reduce((t, l) => Math.min(t, l.Tier), 2),
	Object.values(group?.groups || {}).reduce((t, g) => Math.min(t, getMinTier(g)), 2),
);

export const torIcon = `<svg class="small-icon" viewBox="-3 -1 24 24" role="img" focusable="false">
	<path fill-rule="evenodd" clip-rule="evenodd" d="M9 0.5C9.30668 0.5 9.58246 0.686713 9.69636 0.971457C10.37 2.65562 11.5843 3.78597 12.873 4.74687C13.1951 4.98702 13.5179 5.21389 13.8382 5.43757C13.8726 5.46159 13.907 5.48561 13.9415 5.50962C14.2243 5.70701 14.5067 5.90404 14.773 6.09935C15.3625 6.5317 15.938 7.00078 16.3502 7.54957C17.386 8.92848 18 10.6436 18 12.5C18 14.8136 16.8599 17.0574 15.2086 18.7086C13.5574 20.3599 11.3136 21.5 9 21.5C6.68642 21.5 4.44259 20.3599 2.79137 18.7086C1.14015 17.0574 0 14.8136 0 12.5C0 10.6436 0.614036 8.92848 1.64978 7.54957C2.06199 7.00078 2.63748 6.5317 3.22699 6.09935C3.4933 5.90404 3.77567 5.70701 4.05855 5.50962C4.09296 5.48561 4.12738 5.46159 4.16178 5.43757C4.48211 5.21389 4.80495 4.98702 5.12702 4.74687C6.41569 3.78597 7.62998 2.65562 8.30364 0.971457C8.41754 0.686713 8.69332 0.5 9 0.5ZM4.11409 7.30892C3.54397 7.72705 3.12107 8.08839 2.84913 8.45043C2.0018 9.5785 1.5 10.9796 1.5 12.5C1.5 14.3286 2.41378 16.2097 3.85203 17.648C4.49187 18.2878 5.21938 18.8239 5.99091 19.2218C5.72839 18.9304 5.48633 18.607 5.26811 18.2605C4.34149 16.789 3.75 14.772 3.75 12.5C3.75 10.7553 4.42637 9.43311 5.08005 8.15528C5.16396 7.99126 5.2475 7.82796 5.32918 7.66459C5.74669 6.82957 6.11435 6.24273 6.447 5.71179C6.48324 5.65395 6.51906 5.59677 6.55449 5.54001C6.37685 5.6822 6.19937 5.81836 6.02366 5.94938C5.68119 6.20475 5.34153 6.44327 5.02056 6.66741C4.98594 6.69158 4.95158 6.71556 4.91748 6.73935C4.63231 6.93836 4.36518 7.12478 4.11409 7.30892ZM8.25 5.63409C8.05075 5.99063 7.84649 6.31861 7.6387 6.65225C7.32248 7.15999 6.9981 7.68084 6.67082 8.33541C6.58425 8.50854 6.49944 8.67559 6.41705 8.83786C5.75523 10.1414 5.25 11.1365 5.25 12.5C5.25 14.5236 5.77886 16.2566 6.53742 17.4612C7.07102 18.3086 7.67549 18.8375 8.25 19.0845V5.63409ZM9.75 19.95C11.3335 19.7409 12.9059 18.89 14.148 17.648C15.5862 16.2097 16.5 14.3286 16.5 12.5C16.5 10.9796 15.9982 9.5785 15.1509 8.45043C14.8789 8.08839 14.456 7.72705 13.8859 7.30892C13.6348 7.12477 13.3677 6.93835 13.0825 6.73933C13.0484 6.71554 13.014 6.69157 12.9794 6.66741C12.6585 6.44327 12.3188 6.20475 11.9763 5.94938C11.2248 5.38899 10.4409 4.73446 9.75 3.91648V19.95Z" />
</svg>`;

const getGroupIcon = (type: CountryItem['type'], countryCode: string): string => {
	if (type === 'tor') {
		return torIcon;
	}

	if (type === 'city') {
		return `<svg class="small-icon" viewBox="0 0 24 24" role="img" focusable="false">
			<path fill-rule="evenodd" d="M12 3C8.675 3 6 5.67 6 8.94c0 1.66.47 3.29 1.36 4.7l4.392 6.972a16.527 16.527 0 0 0 .248.386l.018-.026c.05-.076.117-.181.23-.36l4.393-6.972A8.815 8.815 0 0 0 18 8.94C18 5.67 15.325 3 12 3ZM6.09 14.44a10.315 10.315 0 0 1-1.59-5.5C4.5 4.83 7.858 1.5 12 1.5c4.142 0 7.5 3.33 7.5 7.44 0 1.945-.55 3.85-1.59 5.5l-4.393 6.972c-.215.341-.323.512-.423.618a1.508 1.508 0 0 1-2.188 0c-.1-.106-.208-.277-.423-.619L6.09 14.44Z" clip-rule="evenodd"/>
			<path fill-rule="evenodd" d="M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm0 1.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clip-rule="evenodd"/>
		</svg>`;
	}

	if (type === 'free') {
		return getCountryFlag(countryCode, true);
	}

	return `<svg class="small-icon" viewBox="0 0 24 24" role="img" focusable="false">
		<path d="M20 3H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM4 9V5h16v4zm16 4H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2zM4 19v-4h16v4z"/>
		<path d="M17 6h2v2h-2zm-3 0h2v2h-2zm3 10h2v2h-2zm-3 0h2v2h-2z"/>
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
