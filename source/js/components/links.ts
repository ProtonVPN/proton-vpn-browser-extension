import {each} from '../tools/each';
import {c, getLocaleSupport, getPrimaryLanguage} from '../tools/translate';

/**
 * Replace the URL (going to a page in English) with the equivalent URL.
 *
 * For instance https://protonvpn.com/support/contact exists in French as https://protonvpn.com/support/fr/contact
 *
 * @param url           URL of the page in English
 * @param localeSupport List of languages in which the page is available
 */
const localizeUrl = (url: string, localeSupport: string[]) => {
	const primaryLanguage = getPrimaryLanguage();

	if (!localeSupport.includes(primaryLanguage)) {
		return url;
	}

	const newUrl = url.replace(/^(https:\/\/protonvpn\.com\/support\/)/, '$1' + primaryLanguage + '/');

	if (newUrl !== url) {
		return newUrl;
	}

	return url.replace(/^(https:\/\/protonvpn\.com\/)/, '$1' + primaryLanguage + '/');
};

/**
 * Set the title of the element based on its inner text, or if empty, the alternative text of the
 * first image found in it.
 *
 * Then append (new tab) translated to the title.
 */
export const setNewTabLinkTitle = (button: HTMLElement) => {
	if (!button.getAttribute('aria-label') && !button.getAttribute('title')) {
		const linkDescription = button.innerText.trim() || button.getElementsByTagName('img')[0]?.getAttribute('alt');

		if (linkDescription) {
			button.setAttribute(
				'title',
				// translator: explain that the link opens in a new tab
				c('Action').t`${linkDescription} (New tab)`,
			);
		}
	}
};

/**
 * Initial setup for the link elements (containing href) in a given area or the whole document,
 * it configures the title and click handler.
 * This function is idempotent, meaning it can be called multiple times without side effects, e.g. in a render function or a click handler.
 */
export const configureLinks =  (
	area: HTMLDivElement | Document,
	triggerLinkButton: (link: string, button: HTMLElement) => void,
) => {
	each({'a[href]': 'href', '[data-href]': 'data-href'}, (selector, attribute) => {
		(area || document).querySelectorAll<HTMLDivElement>(selector).forEach(button => {
			if (button.classList.contains('href-configured')) {
				return;
			}

			button.classList.add('href-configured');

			setNewTabLinkTitle(button);
			button.addEventListener('click', (event) => {
				const url = button.getAttribute(attribute);

				if (url) {
					event.preventDefault();
					event.stopPropagation();
					triggerLinkButton(localizeUrl(url, getLocaleSupport(button.dataset)), button);
				}
			});
		});
	});
};
