import {CacheItem} from '../tools/storage';
import {upgradeButton} from '../components/upgradeButton';

export const toggleButtons = <T extends {value: boolean}>(
	feature: CacheItem<T>,
	valueHandler: T,
	options?: {
		refresh?: (newValue?: boolean) => void,
		buttonSelector?: string,
		upgradeNeeded?: boolean,
	},
) => {
	const buttons = document.querySelectorAll<HTMLInputElement>(options?.buttonSelector || `.${feature.key}-button`);
	buttons.forEach(button => {
		if (options?.upgradeNeeded) {
			const div = document.createElement('div');
			div.innerHTML = upgradeButton();
			button.parentNode?.replaceChild(div, button);

			return;
		}

		const method = valueHandler.value ? 'add' : 'remove';
		button.classList[method]('activated');
		button.setAttribute('aria-pressed', valueHandler.value ? 'true' : 'false');
		button.addEventListener('click', async () => {
			valueHandler.value = !valueHandler.value;
			const method = valueHandler.value ? 'add' : 'remove';
			buttons.forEach(b => {
				b.classList[method]('activated');
				b.setAttribute('aria-pressed', valueHandler.value ? 'true' : 'false');
			});
			options?.refresh?.(valueHandler.value);
			await feature.set(valueHandler);
		});
	});
};
