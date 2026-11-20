'use popup';
import {getFeatureFlag} from '../../featureFlag/getFeatureFlag';
import {
	fingerprintGroups,
	getFingerprintGroupKey,
} from '../../fingerprint/FingerprintGroup';
import {isFingerprintOptionsEnabled} from '../../fingerprint/isFingerprintOptionsEnabled';
import {
	isFingerprintProtectionSupported,
	minimumFirefoxVersion,
} from '../../fingerprint/isFingerprintProtectionSupported';
import {fingerprintSuggestionDismissed} from '../../fingerprint/storedFingerprintSettings';
import {c} from '../../tools/translate';
import {storagePrefix} from '../../tools/storage';
import {triggerPromise} from '../../tools/triggerPromise';
import {connectedServer} from '../../vpn/connectedServer';
import type {FingerprintFeatures} from '../../vpn/features/FingerprintProtection';
import {loadFingerprintFeatures} from '../../vpn/features/FingerprintProtection';
import {toggleButtons} from '../toggleButtons';

const countEnabled = (features: FingerprintFeatures) =>
	fingerprintGroups.filter((group) => features[group].config.value).length;

/** Suggestion shown once connected, needs the page to link to */
const isFingerprintSuggestionEnabled = async (): Promise<boolean> =>
	(await isFingerprintOptionsEnabled()) &&
	(await getFeatureFlag('AntiFingerprintInformation'));

/**
 * Once connected, suggest (until dismissed) to also spoof fingerprinting
 * values when none of them is enabled yet.
 */
export const showFingerprintSuggestion = async (
	slot: HTMLElement | null,
	features: FingerprintFeatures,
	connected: boolean,
	goTo: (page: string) => void,
): Promise<void> => {
	if (!slot) {
		return;
	}

	if (
		!connected ||
		countEnabled(features) > 0 ||
		!isFingerprintProtectionSupported() ||
		(await fingerprintSuggestionDismissed.get())?.value ||
		!(await isFingerprintSuggestionEnabled())
	) {
		slot.innerHTML = '';

		return;
	}

	if (slot.firstElementChild) {
		return;
	}

	// nosemgrep:insecure-innerhtml
	slot.innerHTML = `<div class="error-message info-message fingerprint-suggestion">
		<div class="icon">
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path fill-rule="evenodd" d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm10-4.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm.75 3.75a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 1.5 0v-5Z" clip-rule="evenodd"/>
			</svg>
		</div>
		<div class="text">
			<span class="notice-text">${c('Info').t`Your IP address is hidden, but your browser can still be recognized by its timezone, language, screen and more. Blend in with the crowd?`}</span>
			<a href="#" class="text-link fingerprint-suggestion-link">${c('Action').t`Set up fingerprint protection`}</a>
		</div>
		<button class="close-button" aria-label="${c('Info').t`Close`}">
			<svg viewBox="0 0 24 24">
				<path fill-rule="evenodd" d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>
			</svg>
		</button>
	</div>`;

	slot
		.querySelector('.fingerprint-suggestion-link')
		?.addEventListener('click', (event) => {
			event.preventDefault();
			goTo('fingerprint');
		});

	slot.querySelector('.close-button')?.addEventListener('click', () => {
		triggerPromise(fingerprintSuggestionDismissed.setValue(1));
		slot.innerHTML = '';
	});
};

/**
 * Old browsers can't run the spoofing before the page scripts: explain why
 * at the top of the page and leave the toggles off and disabled.
 */
const showUnsupportedBrowser = (area: HTMLElement) => {
	const slot = area.querySelector<HTMLElement>('.fingerprint-unsupported-slot');

	if (slot) {
		const version = minimumFirefoxVersion;
		// nosemgrep:insecure-innerhtml
		slot.innerHTML = `<div class="error-message info-message fingerprint-unsupported">
			<div class="icon">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path fill-rule="evenodd" d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm10-4.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm.75 3.75a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 1.5 0v-5Z" clip-rule="evenodd"/>
				</svg>
			</div>
			<div class="text">
				<span class="notice-text">${
					/*
					translator: version is the minimum Firefox version number: "128"
					*/ c('Info')
						.t`Please upgrade your browser first to enable those options (Firefox ${version} or later).`
				}</span>
			</div>
		</div>`;
	}

	fingerprintGroups.forEach((group) => {
		area
			.querySelectorAll<HTMLButtonElement>(
				`.${getFingerprintGroupKey(group)}-button`,
			)
			.forEach((button) => {
				button.disabled = true;
				button.classList.remove('activated');
				button.setAttribute('aria-pressed', 'false');
			});
	});
};

/**
 * Set up the fingerprint protection page toggles, the summary on the
 * features page and the suggestion shown once connected.
 */
export const configureFingerprintProtection = async (
	area: HTMLElement,
	isConnected: () => boolean,
	goTo: (page: string) => void,
): Promise<FingerprintFeatures | undefined> => {
	const entryBlocks = area.querySelectorAll<HTMLElement>(
		'.fingerprint-protection-action-block',
	);
	const setEntryVisible = (visible: boolean) => {
		entryBlocks.forEach((block) => {
			block.style.display = visible ? '' : 'none';
		});
	};

	// Hidden until the flag is known (it may need to be fetched)
	setEntryVisible(false);

	if (!(await isFingerprintOptionsEnabled())) {
		return undefined;
	}

	setEntryVisible(true);

	const features = await loadFingerprintFeatures();
	const slot = area.querySelector<HTMLElement>('.fingerprint-suggestion-slot');
	const refreshSuggestion = () =>
		triggerPromise(
			showFingerprintSuggestion(slot, features, isConnected(), goTo),
		);

	const supported = isFingerprintProtectionSupported();

	const refreshCount = () => {
		const count = supported ? countEnabled(features) : 0;
		area
			.querySelectorAll<HTMLElement>('.fingerprint-protection-count')
			.forEach((element) => {
				element.textContent = count
					? `${count}/${fingerprintGroups.length}`
					: c('Info').t`Off`;
			});
	};

	if (supported) {
		fingerprintGroups.forEach((group) => {
			const feature = features[group];

			toggleButtons(area, feature.feature.getCacheItem(), feature.config, {
				feature,
				refresh: () => {
					refreshCount();
					refreshSuggestion();
				},
			});
		});
	} else {
		showUnsupportedBrowser(area);
	}

	refreshCount();
	refreshSuggestion();

	// Connection state changes while the popup is open
	const connectedServerKey = storagePrefix + connectedServer.key;
	chrome.storage?.onChanged?.addListener((changes) => {
		if (connectedServerKey in changes) {
			// Let the popup update its own connection state first
			setTimeout(refreshSuggestion, 50);
		}
	});

	return features;
};
