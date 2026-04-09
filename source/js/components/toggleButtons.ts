import {escapeHtml} from '../tools/escapeHtml';
import {upgradeButton} from '../components/upgradeButton';
import {translateToggleButtonTitle} from '../tools/translate';
import {stopEvent} from '../tools/stopEvent';
import type {CacheItem} from '../tools/storage';
import type {LoadedFeature} from '../vpn/features/loadAllFeatures';
import type {FeatureWrapper} from '../vpn/features/FeatureWrapper';
import type {LocallyStoredFeature} from '../vpn/features/LocallyStoredFeature';

const configureLock = (
	button: HTMLButtonElement,
	feature: (FeatureWrapper & LocallyStoredFeature) | undefined,
) => {
	const disabled = feature && !feature.isControllable();
	button.style.pointerEvents = disabled ? 'none' : '';
	const previousNode = button.previousElementSibling;
	const hasLock = previousNode?.classList.contains('locked-feature');

	if (!disabled) {
		if (hasLock) {
			previousNode?.parentNode?.removeChild(previousNode);
		}

		return;
	}

	if (hasLock) {
		return;
	}

	const div = document.createElement('div');
	div.setAttribute('class', 'locked-feature');
	div.innerHTML = `
		<a href="#" title="${escapeHtml(feature.getControlMessage())}">
			<svg
				fill="currentColor"
				viewBox="0 0 1309.443 1658.036"
				xmlns="http://www.w3.org/2000/svg"
			>
				<use xlink:href="img/icons.svg#lock"></use>
			</svg>
		</a>
	`;

	button.parentNode?.insertBefore(div, button);

	div.querySelector<HTMLLinkElement>('a')!.addEventListener('click', stopEvent);
};

export const toggleButtons = <T extends {value: boolean}>(
	area: HTMLElement,
	feature: CacheItem<T>,
	valueHandler: T,
	options?: {
		refresh?: (newValue?: boolean) => void;
		buttonSelector?: string;
		upgradeNeeded?: boolean;
		feature?: LoadedFeature<FeatureWrapper & LocallyStoredFeature>;
	},
) => {
	const buttons = area.querySelectorAll<HTMLButtonElement>(
		options?.buttonSelector || `.${feature.key}-button`,
	);
	buttons.forEach((button) => {
		if (options?.upgradeNeeded) {
			const div = document.createElement('div');
			div.innerHTML = upgradeButton();
			button.parentNode?.replaceChild(div, button);

			return;
		}

		const control = options?.feature?.feature;
		configureLock(button, control);

		const method = valueHandler.value ? 'add' : 'remove';
		translateToggleButtonTitle(button, valueHandler.value);
		button.classList[method]('activated');
		button.setAttribute('aria-pressed', valueHandler.value ? 'true' : 'false');

		button.addEventListener('click', async () => {
			if (control && !control.isControllable()) {
				return;
			}

			valueHandler.value = !valueHandler.value;
			translateToggleButtonTitle(button, valueHandler.value);

			const method = valueHandler.value ? 'add' : 'remove';
			buttons.forEach((b) => {
				b.classList[method]('activated');
				b.setAttribute('aria-pressed', valueHandler.value ? 'true' : 'false');
			});
			options?.refresh?.(valueHandler.value);
			await feature.set(valueHandler);
		});
	});
};
