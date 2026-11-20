import type {SpoofedProfile} from './SpoofedProfile';
import {baseAPIURL} from '../config';
import {warn} from '../log/log';

type Rule = chrome.declarativeNetRequest.Rule;
type ModifyHeaderInfo = chrome.declarativeNetRequest.ModifyHeaderInfo;

/** Session rules ids reserved for fingerprint protection */
export const headerRuleIds = {
	userAgent: 4201,
	language: 4202,
	api: 4203,
} as const;

/**
 * All types supported by both Chromium and Firefox (unknown types make the
 * whole rule invalid), main_frame must be explicit as it's excluded when
 * no type is given.
 */
const resourceTypes = [
	'main_frame',
	'sub_frame',
	'stylesheet',
	'script',
	'image',
	'font',
	'object',
	'xmlhttprequest',
	'ping',
	'csp_report',
	'media',
	'websocket',
	'other',
] as chrome.declarativeNetRequest.ResourceType[];

const set = (header: string, value: string): ModifyHeaderInfo => ({
	header,
	operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
	value,
});

const remove = (header: string): ModifyHeaderInfo => ({
	header,
	operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation,
});

const rule = (id: number, requestHeaders: ModifyHeaderInfo[]): Rule => ({
	id,
	priority: 1,
	action: {
		type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
		requestHeaders,
	},
	condition: {
		resourceTypes,
		// Requests not coming from a tab are the extension own requests
		// (Proton API), leave them as is.
		excludedTabIds: [-1],
	},
});

/**
 * Never touch requests to our API (from the extension or from a tab, and
 * even when excludedTabIds is not supported): an allow rule prevents rules
 * with a lower priority from applying.
 */
const apiRule = (): Rule => ({
	id: headerRuleIds.api,
	priority: 2,
	action: {
		type: 'allow' as chrome.declarativeNetRequest.RuleActionType,
	},
	condition: {
		resourceTypes,
		urlFilter: `|${baseAPIURL}`,
	},
});

/**
 * Headers sent by the browser must tell the same thing as the values
 * exposed to JavaScript, else the mismatch itself becomes a fingerprint.
 */
export const getHeaderRules = (profile: SpoofedProfile | undefined): Rule[] => {
	const rules: Rule[] = [];
	const userAgent = profile?.userAgent;
	const language = profile?.language;

	if (userAgent) {
		rules.push(
			rule(headerRuleIds.userAgent, [
				set('User-Agent', userAgent.userAgent),
				// Low-entropy hint, sent with every request by Chromium
				set('Sec-CH-UA-Platform', `"${userAgent.clientHints.platform}"`),
				// High-entropy hints are only sent when a website asks for them
				// (Accept-CH), they can't be set conditionally, so drop them
				// rather than leaking the real OS.
				remove('Sec-CH-UA-Platform-Version'),
				remove('Sec-CH-UA-Arch'),
				remove('Sec-CH-UA-Bitness'),
				remove('Sec-CH-UA-Model'),
			]),
		);
	}

	if (language) {
		rules.push(
			rule(headerRuleIds.language, [
				set('Accept-Language', language.acceptLanguage),
			]),
		);
	}

	if (rules.length) {
		rules.push(apiRule());
	}

	return rules;
};

const getDeclarativeNetRequest = () =>
	(chrome as typeof chrome | undefined)?.declarativeNetRequest;

/**
 * Replace the previous fingerprint rules (if any) with the ones matching
 * the given profile, or just remove them when no profile is given.
 */
export const applyHeaderRules = async (
	profile: SpoofedProfile | undefined,
): Promise<void> => {
	const declarativeNetRequest = getDeclarativeNetRequest();

	if (!declarativeNetRequest?.updateSessionRules) {
		return;
	}

	const removeRuleIds = Object.values(headerRuleIds);
	const addRules = getHeaderRules(profile);

	try {
		await declarativeNetRequest.updateSessionRules({removeRuleIds, addRules});
	} catch (error) {
		// Some browsers don't support excludedTabIds, fall back to all requests
		warn('Unable to set fingerprint header rules', error);
		await declarativeNetRequest.updateSessionRules({
			removeRuleIds,
			addRules: addRules.map((rule) => {
				const condition = {...rule.condition};
				delete condition.excludedTabIds;

				return {...rule, condition};
			}),
		});
	}
};
