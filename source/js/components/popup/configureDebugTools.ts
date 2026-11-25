'use popup';
import {appVersion} from '../../config';

export const configureDebugTools = (
	area: HTMLElement,
	start: (area: HTMLElement) => Promise<void>,
) => {
	const settingsPageTitle = area.querySelector(
		'*[data-page="settings"] .page-title',
	);

	settingsPageTitle?.addEventListener('dblclick', (event) => {
		const settingPage = area.querySelector('*[data-page="settings"]');

		if (!settingPage) {
			return;
		}

		const keyEvent = event as MouseEvent;

		if (keyEvent.ctrlKey && keyEvent.altKey) {
			settingPage.classList.toggle('debug-mode');
		}
	});

	const maxTierInput = area.querySelector(
		'#max-tier',
	) as HTMLInputElement | null;
	maxTierInput?.addEventListener('input', async () => {
		const root = global as unknown as {logicalMaxTier: number};
		const oldValue = root.logicalMaxTier || 2;
		const newValue = Number(maxTierInput.value);

		if (oldValue === newValue) {
			return;
		}

		root.logicalMaxTier = newValue;
		await start(area);
	});

	area.querySelectorAll('.version-slot').forEach((slot) => {
		slot.textContent = appVersion;
	});
};
