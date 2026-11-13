'use popup';
import type {LogicalFromButtonGetter} from '../configureExpandButton';
import {configureExpandButton} from '../configureExpandButton';
import {onClick} from '../onClick';
import {configureRemoveRecentButton} from '../configureRemoveRecentButton';
import type {Choice} from '../../vpn/lastChoice';
import type {Logical} from '../../vpn/Logical';

/**
 * Configure buttons that need a logged-in user and loaded servers:
 * expand/collapse of server groups, removal of recents, and connection
 * to a server.
 */
export const getServerButtonsConfigurator = (
	area: HTMLElement,
	isSecureCoreEnabled: () => boolean,
	goTo: (name: string) => void,
	goToRegion: (name: string, content: string) => void,
	getLogicalFromButton: LogicalFromButtonGetter,
	refresh: () => void,
	setLastChoiceWithCurrentOptions: (choice: Choice) => void,
	connectToServer: (logical: Logical) => Promise<void>,
) => ({
	configureServerButtons(subArea?: HTMLElement) {
		configureExpandButton(
			subArea || area,
			isSecureCoreEnabled,
			onClick,
			goToRegion,
			getLogicalFromButton,
		);
		configureRemoveRecentButton(subArea || area, onClick, () => {
			refresh();
		});
	},

	async handleServerButtonClick(button: HTMLButtonElement) {
		const {getLogical, choice} = getLogicalFromButton(button);
		const logical = getLogical?.();

		if (!logical) {
			throw new Error(
				'Misconfigured server. Cannot find the selected logical.',
			);
		}

		setLastChoiceWithCurrentOptions({
			connected: true,
			...choice,
		});
		goTo('world');
		await connectToServer(logical);
	},
});
