import {StoredWebsiteExclusionList} from '../vpn/WebsiteExclusion';
import {CacheItem} from '../tools/storage';
import {triggerPromise} from '../tools/triggerPromise';
import {escapeHtml} from '../tools/escapeHtml';
import {c} from '../tools/translate';
import {upgradeButton} from '../components/upgradeButton';

export const configureSplitTunneling = (
	storedList: CacheItem<StoredWebsiteExclusionList>,
	list: StoredWebsiteExclusionList,
	area: ParentNode,
	refresh?: () => void,
	upgradeNeeded = false,
) => {
	if (upgradeNeeded) {
		const buttons = document.querySelectorAll<HTMLInputElement>('[data-go-to="split-tunneling"]');
		buttons.forEach(button => {
			const div = document.createElement('div');
			div.innerHTML = upgradeButton();
			button.parentNode?.replaceChild(div, button);
		});

		return;
	}

	area.querySelectorAll<HTMLDivElement>('.split-tunneling-exclusions, .split-tunneling-exclusion-add').forEach(element => {
		element.style.display = list.value.length ? 'block' : 'none';
	});
	area.querySelectorAll<HTMLDivElement>('.split-tunneling-exclusion-form').forEach(element => {
		element.style.display = list.value.length ? 'none' : 'block';
	});

	const html = list.value.map((exclusion, index) => {
		const domain = escapeHtml(exclusion.domain);
		const title = /* translator: this is a tooltip/vocalization for the button to remove an exclusion from split tunneling, domain can be "youtube.com" or "www.anysite.net"
			*/ c('Action').t`Remove ${domain}`;

		return `<div class="flex my1">
			<div class="flex-1 ov-hidden"><div class="ellipsis">${domain}</div>${exclusion.withSubDomains ? `<div class="fade-text small-text">${
				/* translator: mention added after a domain such as "example.com" in the Split-tunneling exclusion list to explain that subdomains will also be excluded. */
				c('Label').t`And all its subdomains`
			}</div>` : ''}</div>
			<button data-st-delete="${index}" title="${title}" class="small-button delete-button">
				<svg fill="currentColor" viewBox="0 0 24 24">
					<use xlink:href="img/icons.svg#delete"></use>
				</svg>
			</button>
		</div>`;
	}).join('');

	area.querySelectorAll<HTMLDivElement>('.split-tunneling-exclusions .exclusions-list').forEach(element => {
		element.innerHTML = html;
		element.querySelectorAll<HTMLButtonElement>('[data-st-delete]').forEach(previousButton => {
			const button = previousButton.cloneNode(true) as HTMLButtonElement;
			(previousButton.parentNode as ParentNode).replaceChild(button, previousButton);
			button.addEventListener('click', () => {
				list.value.splice(Number(button.getAttribute('data-st-delete')), 1);
				refresh?.();
				configureSplitTunneling(storedList, list, area, refresh);
				triggerPromise(storedList.setValue(list.value));
			});
		});
	});

	const input = area.querySelector<HTMLInputElement>('.split-tunneling-exclusion') as HTMLInputElement;

	const seedWithCurrentDomain = () => {
		browser.tabs.query({
			active: true,
			currentWindow: true,
		}).then(tabs => {
			const domain = tabs[0]?.url && new URL(tabs[0].url).hostname;

			if (domain) {
				const tld = domain.replace(/^.*\.([^.]+\.[a-z]+)$/, '$1');

				if (list.value.every(exclusion => exclusion.domain !== tld)) {
					input.value = tld;
				} else if (input.value === tld) {
					input.value = '';
				}

				checkValidity();
			}
		});
	};

	if (!list.value.length) {
		seedWithCurrentDomain();
	}

	const checkValidity = () => {
		area.querySelectorAll<HTMLButtonElement>('[data-st-action="add"]').forEach(button => {
			button.disabled = !input.checkValidity();
		});
	};
	const addWebsite = () => {
		if (input.value !== '') {
			list.value.push({
				domain: input.value,
				withSubDomains: checkbox.checked,
			});
			refresh?.();
		}
		input.value = '';
		checkbox.checked = true;
		configureSplitTunneling(storedList, list, area, refresh);
		triggerPromise(storedList.setValue(list.value));
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
				case 'add-website':
					area.querySelectorAll<HTMLDivElement>('.split-tunneling-exclusion-add').forEach(element => {
						element.style.display = 'none';
					});
					area.querySelectorAll<HTMLDivElement>('.split-tunneling-exclusion-form').forEach(element => {
						element.style.display = 'block';
					});
					seedWithCurrentDomain();
					break;

				case 'add':
					addWebsite();
					break;

				case 'cancel':
					input.value = '';
					checkbox.checked = true;

					if (!list.value.length) {
						area.querySelectorAll<HTMLDivElement>('.split-tunneling-exclusion-add').forEach(element => {
							element.style.display = 'block';
						});
						area.querySelectorAll<HTMLDivElement>('.split-tunneling-exclusion-form').forEach(element => {
							element.style.display = 'none';
						});
					}
					break;
			}
		});
	});
};
