'use popup';
import {warn} from '../../log/log';

type RegionState = {name: string; content: string};
type RegionConfigurator = (subArea: HTMLElement) => void;

export const regionPage = (area: HTMLElement) => {
	let currentRegionState: RegionState | undefined = undefined;
	let currentConfigurator: RegionConfigurator | undefined = undefined;
	const backStates: RegionState[] = [];

	const set = (name: string, content: string) => {
		currentRegionState = {name, content};

		const nameSlot = area.querySelector<HTMLDivElement>(
			'[data-page="region"] .page-title .name',
		);
		const regionSlot = area.querySelector<HTMLDivElement>(
			'[data-page="region"] .region-content',
		);

		if (nameSlot) {
			// nosemgrep:insecure-innerhtml
			nameSlot.innerHTML = name;
		}

		if (regionSlot && content) {
			// nosemgrep:insecure-innerhtml
			regionSlot.innerHTML = content;

			if (!currentConfigurator) {
				warn('No configurator set for the region page');

				return;
			}

			currentConfigurator(regionSlot);
		}
	};

	return {
		setConfigurator(configurator: RegionConfigurator | undefined) {
			currentConfigurator = configurator;
		},
		enter(name: string, content: string) {
			if (currentRegionState) {
				backStates.push(currentRegionState);
			}

			set(name, content);
		},
		back(): boolean {
			const backState = backStates.pop();

			if (!backState) {
				return false;
			}

			const {name, content} = backState;

			set(name, content);

			return true;
		},
		leave() {
			currentRegionState = undefined;

			if (backStates.length) {
				backStates.splice(0, backStates.length);
			}
		},
	};
};
