'use popup';
import {getUserGetterWithInMemoryCache} from '../../account/user/userInMemoryCache';
import {checkProxySupport} from '../../vpn/proxy/checkProxySupport';
import {loadSessionForPopup} from './loadSessionForPopup';
import {fetchTranslations} from '../../tools/translate';
import {showSigningView} from '../signIn/showSigningView';
import {displayFeatureBlocks} from './displayFeatureBlocks';
import {handleTheme} from './handleTheme';
import {createSessionIfNeeded} from './createSessionIfNeeded';
import {initErrorModalCloseButtons} from '../modals/closeErrorModal';
import {regionPage} from './regionPage';
import {warn} from '../../log/log';
import {configureCallbackOnce} from '../../tools/configureCallbackOnce';

export const initializePopup = async (area: HTMLElement) => {
	const {get: getPmUser, set: setPmUser} = getUserGetterWithInMemoryCache();
	const session = await loadSessionForPopup(getPmUser);

	await fetchTranslations();

	const spinner = area.querySelector<HTMLElement>('#spinner');
	const loggedView = area.querySelector<HTMLElement>('#logged-view');
	const proxySupported = await checkProxySupport(() => {
		showSigningView(
			area.querySelector('#sign-in-view'),
			loggedView,
			spinner,
			false,
		);
	});

	if (typeof proxySupported === 'undefined') {
		return undefined;
	}

	displayFeatureBlocks(area);

	const {initializeThemeSelector} = handleTheme(area);

	if (!(await createSessionIfNeeded(area, session))) {
		return undefined;
	}

	const errorModal = area.querySelector<HTMLDivElement>('#modal-error')!;

	initErrorModalCloseButtons(
		errorModal,
		area,
		loggedView,
		spinner,
		proxySupported,
	);

	const errorSlot = area.querySelector('.error-slot') as HTMLDivElement;

	const region = regionPage(area);
	const goToConfigurator = configureCallbackOnce('goTo', (page: string) => {
		warn(`Cannot go to ${page}, goTo is not yet configured`);
	});
	const goTo = goToConfigurator.get();

	const goToRegion = (name: string, content: string) => {
		region.enter(name, content);

		goTo('region');
	};

	return {
		session,
		getPmUser,
		setPmUser,
		spinner,
		loggedView,
		errorModal,
		proxySupported,
		initializeThemeSelector,
		errorSlot,
		region,
		goTo,
		configureGoTo: goToConfigurator.set,
		goToRegion,
	};
};
