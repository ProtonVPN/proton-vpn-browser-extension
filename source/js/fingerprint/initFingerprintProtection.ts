'use background';
import {fingerprintProtectionEnabled} from '../config';
import {featureFlagCache} from '../featureFlag/getFeatureFlag';
import {warn} from '../log/log';
import {storage, Storage, storagePrefix} from '../tools/storage';
import {triggerPromise} from '../tools/triggerPromise';
import {connectedServer} from '../vpn/connectedServer';
import {getEnabledFingerprintGroups} from '../vpn/features/FingerprintProtection';
import type {FingerprintSpec} from './buildSpoofedProfile';
import {
	buildFingerprintSpec,
	buildProfileFromSpec,
} from './buildSpoofedProfile';
import {
	FingerprintGroup,
	fingerprintGroups,
	getFingerprintGroupKey,
} from './FingerprintGroup';
import type {FingerprintUpdateMessage} from './handshake';
import {fingerprintUpdateMessage} from './handshake';
import {applyHeaderRules} from './headerRules';
import {getSpecFiles} from './specEncoding';
import {specSeedDigits} from './specTokens';
import type {SpoofedProfile} from './SpoofedProfile';

type RegisteredContentScript = chrome.scripting.RegisteredContentScript;

export const contentScriptIds = {
	page: 'protonvpn-fingerprint-page',
	relay: 'protonvpn-fingerprint-relay',
} as const;

const matches = ['http://*/*', 'https://*/*'];

const watchedKeys = [
	// Refreshed periodically, AntiFingerprintOptions may turn spoofing off
	featureFlagCache.key,
	connectedServer.key,
	...fingerprintGroups.map(getFingerprintGroupKey),
].map((key) => storagePrefix + key);

/**
 * Canvas noise seed, drawn again for each server so the canvas changes
 * along with the IP address, but kept for the browser session (pages
 * loaded before a service worker restart keep the same one).
 */
const storedCanvasSeed = storage.item<{value: number; server: string}>(
	'fingerprint-canvas-seed',
	Storage.SESSION,
);

export const getCanvasSeed = async (server: string): Promise<number> => {
	const stored = await storedCanvasSeed.get();

	if (stored && stored.server === server) {
		return stored.value;
	}

	const value =
		(crypto.getRandomValues(new Uint32Array(1))[0] as number) %
		10 ** specSeedDigits;
	await storedCanvasSeed.set({value, server});

	return value;
};

export const computeSpec = async (): Promise<FingerprintSpec | undefined> => {
	const server = (await connectedServer.get())?.value;
	const groups = await getEnabledFingerprintGroups();
	const seed =
		server && groups.includes(FingerprintGroup.CANVAS)
			? await getCanvasSeed(String(server.id))
			: undefined;

	return buildFingerprintSpec(server, groups, seed);
};

const getScripting = () =>
	(chrome as typeof chrome | undefined)?.scripting as
		typeof chrome.scripting | undefined;

const getContentScripts = (
	spec: FingerprintSpec,
): RegisteredContentScript[] => {
	const common = {
		matches,
		runAt: 'document_start' as chrome.extensionTypes.RunAt,
		allFrames: true,
		// Also about:blank/srcdoc frames, which inherit the page origin
		matchOriginAsFallback: true,
		persistAcrossSessions: false,
	};

	return [
		{
			...common,
			id: contentScriptIds.page,
			js: [...getSpecFiles(spec), 'js/fingerprint.js'],
			world: 'MAIN' as chrome.scripting.ExecutionWorld,
		},
		{
			...common,
			id: contentScriptIds.relay,
			js: ['js/fingerprint-relay.js'],
			world: 'ISOLATED' as chrome.scripting.ExecutionWorld,
		},
	];
};

/**
 * Register the page scripts for the given spec (new documents), or remove
 * them when spoofing must stop.
 */
export const applyContentScripts = async (
	spec: FingerprintSpec | undefined,
): Promise<void> => {
	const scripting = getScripting();

	if (!scripting?.registerContentScripts) {
		return;
	}

	const ids: string[] = Object.values(contentScriptIds);
	const registered = (await scripting.getRegisteredContentScripts({ids})).map(
		(script) => script.id,
	);

	if (registered.length) {
		await scripting.unregisterContentScripts({ids: registered});
	}

	if (!spec) {
		return;
	}

	const scripts = getContentScripts(spec);

	try {
		await scripting.registerContentScripts(scripts);
	} catch (error) {
		try {
			// Older versions may not support matchOriginAsFallback
			await scripting.registerContentScripts(
				scripts.map((script) => {
					const copy = {...script};
					delete copy.matchOriginAsFallback;

					return copy;
				}),
			);
		} catch {
			warn('Unable to register fingerprint scripts', error);
		}
	}
};

/** Update or release (profile = undefined) spoofing in already open pages */
const updateOpenTabs = async (profile: SpoofedProfile | undefined) => {
	const tabs = await chrome.tabs.query({});
	const message: FingerprintUpdateMessage = {
		type: fingerprintUpdateMessage,
		profile: JSON.stringify(profile || null),
	};

	await Promise.all(
		tabs.map(async (tab) => {
			if (typeof tab.id !== 'number' || !/^https?:/.test(tab.url || '')) {
				return;
			}

			// Through the relay of each frame
			try {
				await chrome.tabs.sendMessage(tab.id, message);
			} catch {
				// No relay in this tab (loaded while not spoofed)
			}
		}),
	);
};

let latest: Promise<SpoofedProfile | undefined> | undefined;
/** JSON of the last applied spec, undefined until first applied */
let applied: string | undefined;

/**
 * Recompute the spec from the connected server and the enabled groups,
 * then apply it (header rules, page scripts, open pages) if it changed.
 *
 * Calls are serialized so concurrent changes apply in order.
 */
export const refreshFingerprintProtection = (): Promise<
	SpoofedProfile | undefined
> => {
	const previous = latest;

	latest = (async () => {
		await previous?.catch(() => undefined);
		const spec = await computeSpec();
		const profile = buildProfileFromSpec(spec, navigator.userAgent);
		const json = JSON.stringify(spec || null);

		if (json !== applied) {
			// After a service worker restart, pages already have the right state
			const firstRun = applied === undefined;
			applied = json;
			await applyHeaderRules(profile);
			await applyContentScripts(spec);

			if (!firstRun) {
				await updateOpenTabs(profile);
			}
		}

		return profile;
	})();

	return latest;
};

export const onStorageChanged = (changes: Record<string, unknown>): void => {
	if (Object.keys(changes).some((key) => watchedKeys.includes(key))) {
		triggerPromise(refreshFingerprintProtection());
	}
};

/**
 * Spoof the enabled fingerprint groups while connected only: as soon as
 * the connection stops (or a group is disabled), headers are restored and
 * open pages get their real values back.
 */
export const initFingerprintProtection = (): void => {
	if (!fingerprintProtectionEnabled) {
		return;
	}

	const onChanged = chrome.storage?.onChanged;

	if (onChanged && !onChanged.hasListener(onStorageChanged)) {
		onChanged.addListener(onStorageChanged);
	}

	triggerPromise(refreshFingerprintProtection());
};
