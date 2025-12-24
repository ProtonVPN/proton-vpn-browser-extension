import {SplitTunnelingMode, StoredWebsiteFilterList} from '../vpn/WebsiteFilter';
import {SplitTunnelingDomainManager} from '../vpn/SplitTunnelingDomainManager';
import {getCurrentTab} from '../tools/getCurrentTab';
import {CacheItem} from '../tools/storage';
import {triggerPromise} from '../tools/triggerPromise';
import {escapeHtml} from '../tools/escapeHtml';
import {c} from '../tools/translate';
import {upgradeButton} from './upgradeButton';
import {warn} from '../log/log';

export const configureSplitTunneling = (
	storedList: CacheItem<StoredWebsiteFilterList>,
	list: StoredWebsiteFilterList,
	area: ParentNode,
	refresh?: (updatedList?: StoredWebsiteFilterList) => void,
	upgradeNeeded = false,
) => {
	if (typeof area?.querySelectorAll !== 'function') {
		warn('Passed area has no querySelectorAll function:', area);

		return;
	}

	const domainManager = new SplitTunnelingDomainManager(list);

	const storeList = () => {
		const rawList = domainManager.getRawList();
		triggerPromise(storedList.setValue(rawList.value, {
			enabled: rawList.enabled,
			mode: rawList.mode,
		}));
	};

	// Store the list if we are getting old data.
	if (!('mode' in list) || !('enabled' in list) || !list.value) {
		storeList();
	}

	const refreshEnabled = () => {
		if (typeof area?.querySelectorAll !== 'function') {
			warn('Passed area has no querySelectorAll function:', area);

			return;
		}

		const isEnabled = domainManager.isEnabled();
		const statusDiv = area.querySelector<HTMLDivElement>('.action-pretext')!;
		statusDiv.textContent = isEnabled ? c('Info').t`On` : c('Info').t`Off`;

		area.querySelectorAll<HTMLDivElement>('.split-tunneling-configuration').forEach(configurationBlock => {
			configurationBlock.style.display = isEnabled ? 'block' : 'none';

			// Initialize dropdown
			const switchBar = configurationBlock.querySelector<HTMLDivElement>('.split-tunneling-mode-switch')!;
			const selectedMode = switchBar.querySelector<HTMLDivElement>('#selectedMode');
			const selectedModeText = switchBar.querySelector<HTMLSpanElement>('#selectedModeText');
			const modeDropdownMenu = switchBar.querySelector<HTMLDivElement>('#modeDropdownMenu');
			const modeOptions = modeDropdownMenu?.querySelectorAll<HTMLDivElement>('.dropdown-option');

			if (!selectedMode || !selectedModeText || !modeDropdownMenu || !modeOptions) {
				console.warn('Dropdown elements missing in split tunneling config');
				return;
			}

			const currentMode = domainManager.getCurrentMode();
			const isIncludeMode = currentMode === SplitTunnelingMode.Include;
			const currentModeText = isIncludeMode ? c('Info').t`Include mode` : c('Info').t`Exclude mode`;
			selectedModeText.textContent = currentModeText;
			selectedMode?.setAttribute('data-value', currentMode);

			// Handle mode selection
			modeOptions.forEach(option => {
				const value = option.getAttribute('data-value');
				option.classList.toggle('selected', value === currentModeText);
				option.addEventListener('click', () => {
					const selectedValue = option.getAttribute('data-value') as keyof typeof SplitTunnelingMode;
					if (!selectedValue || !(selectedValue in SplitTunnelingMode)) {
						console.warn('Invalid mode selected');
						return;
					}

					const newMode = SplitTunnelingMode[selectedValue];
					const modeChanged = domainManager.switchMode(newMode);

					if (modeChanged) {
						selectedModeText.textContent = selectedValue;
						option.classList.add('selected');
						modeDropdownMenu.classList.remove('open');

						storeList();
						refresh?.(domainManager.getRawList());

						// Refresh the UI to reflect the mode change
						refreshEnabled();
						toggleAddForm(false);
						renderDomainList();
					}
				});
			});
		});

		area.querySelectorAll<HTMLDivElement>('[data-st-action="toggle"]').forEach(toggle => {
			toggle.classList[isEnabled ? 'add' : 'remove']('activated');
		});
	};

	refreshEnabled();

	if (upgradeNeeded) {
		document?.querySelectorAll<HTMLInputElement>('[data-go-to="split-tunneling"]').forEach(button => {
			const div = document.createElement('div');
			div.innerHTML = upgradeButton();
			button.parentNode?.replaceChild(div, button);
		});

		return;
	}

	const toggleAddForm = (open: boolean) => {

		area.querySelectorAll<HTMLDivElement>('.split-tunneling-filter-add').forEach(element => {
			element.style.display = open ? 'none' : 'block';
		});

		area.querySelectorAll<HTMLDivElement>('.split-tunneling-filter-form').forEach(element => {
			element.style.display = open ? 'block' : 'none';

			element.querySelectorAll<HTMLButtonElement>('[data-st-action="cancel"]').forEach(cancelButton => {
				cancelButton.disabled = domainManager.getCurrentModeDomainsCount() === 0;
			});
		});

		area.querySelectorAll<HTMLDivElement>('.split-tunneling-filters').forEach(element => {
			element.style.display = 'block';
		});
	}

	const renderDomainList = () => {
		const html = domainManager.getDomainsForCurrentMode().map((exclusion, index) => {
			const domain = escapeHtml(exclusion.domain);
			const title = /* translator: this is a tooltip/vocalization for the button to remove an exclusion from split tunneling, domain can be "youtube.com" or "www.anysite.net"
				*/ c('Action').t`Remove ${domain}`;

			return `<div class="flex my1">
				<div class="flex-1 ov-hidden"><div class="ellipsis">${domain}</div>${exclusion.withSubDomains ? `<div class="fade-text small-text">${
					/* translator: mention added after a domain such as "example.com" in the Split-tunneling exclusion list to explain that subdomains will also be excluded. */
					c('Label').t`And all its subdomains`}</div>` : ''}</div>
				<button data-st-delete-index="${index}" title="${title}" class="small-button delete-button">
					<svg fill="currentColor" viewBox="0 0 24 24">
						<use xlink:href="img/icons.svg#delete"></use>
					</svg>
				</button>
			</div>`;
		}).join('');

		area.querySelectorAll<HTMLDivElement>('.split-tunneling-filters .exclusions-list').forEach(element => {
			element.innerHTML = html;
			element.addEventListener('click', (e) => {
				const button = (e.target as Element).closest('[data-st-delete-index]');
				if (button) {
					const indexToDelete = Number(button.getAttribute('data-st-delete-index'));
					const currentModeDomains = domainManager.getDomainsForCurrentMode();
					const targetItem = currentModeDomains[indexToDelete];

					if (targetItem && domainManager.removeDomain(targetItem.domain)) {
						storeList();
						refresh?.(domainManager.getRawList());
						configureSplitTunneling(storedList, domainManager.getRawList(), area, refresh);
					}
				}
			});
		});
	};

	toggleAddForm(false);
	renderDomainList();

	const input = area.querySelector<HTMLInputElement>('.split-tunneling-filter') as HTMLInputElement;

	const seedWithCurrentDomain = () => {
		getCurrentTab().then(tab => {
			const domain = tab?.url && new URL(tab.url).hostname;

			if (domain) {
				const tld = domain.replace(/^.*\.([^.]+\.[a-z]+)$/, '$1');

				if (!domainManager.hasDomainInCurrentMode(tld)) {
					input.value = tld;
				} else if (input.value === tld) {
					input.value = '';
				}

				checkValidity();
			}
		});
	};

	if (domainManager.getCurrentModeDomainsCount() === 0) {
		seedWithCurrentDomain();
	}

	const checkValidity = () => {
		area.querySelectorAll<HTMLButtonElement>('[data-st-action="add"]').forEach(button => {
			button.disabled = !input.checkValidity();
		});
	};
	const addWebsite = () => {
		if (input.value !== '') {
			domainManager.addDomain(input.value, checkbox.checked);
			storeList();
			refresh?.(domainManager.getRawList());
		}
		input.value = '';
		checkbox.checked = true;
		toggleAddForm(false);
		renderDomainList();
	};
	input.oninput = checkValidity;
	input.onchange = checkValidity;
	input.onkeyup = e => {
		if (e.key === 'Enter' || e.keyCode === 13) {
			addWebsite();
		}
	};
	const checkbox = area.querySelector<HTMLInputElement>('.with-subdomains') as HTMLInputElement;
	area.querySelectorAll<HTMLButtonElement>('[data-st-action]').forEach(previousButton => {
		const action = previousButton.getAttribute('data-st-action');
		const button = previousButton.cloneNode(true) as HTMLButtonElement;
		(previousButton.parentNode as ParentNode).replaceChild(button, previousButton);
		button.addEventListener('click', () => {
			switch (action) {
				case 'toggle':
					domainManager.setEnabled(!domainManager.isEnabled());
					refreshEnabled();
					storeList();
					refresh?.(domainManager.getRawList());
					break;

				case 'add-website':
					toggleAddForm(true);
					seedWithCurrentDomain();
					break;

				case 'add':
					addWebsite();
					break;

				case 'cancel':
					if (domainManager.getCurrentModeDomainsCount() === 0) {
						return;
					}

					input.value = '';
					checkbox.checked = true;
					toggleAddForm(false);
					break;
			}
		});
	});
	updateDropdownUI(area);
};

const updateDropdownUI = (area: ParentNode) => {
	const selectedMode = area.querySelector('#selectedMode')!;
	const modeDropdownMenu = area.querySelector<HTMLDivElement>('#modeDropdownMenu')!;
	const includeModeTick = modeDropdownMenu?.querySelector<HTMLDivElement>('#inlcude-mode-tick');
	const excludeModeTick = modeDropdownMenu?.querySelector<HTMLDivElement>('#exclude-mode-tick');
	let isDropdownOpen = false;

	selectedMode.addEventListener('click', (event) => {
		event.stopPropagation();
		isDropdownOpen = !isDropdownOpen;
		modeDropdownMenu.classList[isDropdownOpen ? 'add' : 'remove']('open');
		const isIncludeMode = (selectedMode.getAttribute('data-value') === SplitTunnelingMode.Include);
		includeModeTick?.classList[isIncludeMode ? 'add' : 'remove']('show');
		excludeModeTick?.classList[isIncludeMode ? 'remove' : 'add']('show');
	});

	document.addEventListener('click', (event) => {
		const target = event.target as HTMLElement;

		if (!selectedMode.contains(target) && !modeDropdownMenu.contains(target)) {
			if (isDropdownOpen) {
				isDropdownOpen = false;
				modeDropdownMenu.classList.remove('open');
			}
		}
	});
}

