import type {User} from '../../account/user/User';
import {getBrowser} from '../../tools/getBrowser';
import {milliSeconds} from '../../tools/milliSeconds';
import {getReviewInfoConfig} from '../../account/user/clientconfig/getClientConfig';
import {getReviewInfoState, setReviewInfoState} from '../../vpn/reviewInfo';
import {showModal} from './modals';
import {triggerPromise} from '../../tools/triggerPromise';
import {openTab} from '../../tools/openTab';
import {delay} from '../../tools/delay';

export async function maybeShowRatingModal(user: User) {
	await delay(1000);
	if (await shouldShowRatingModal(user)) {
		const rateUsModal = document.getElementById('rate-us') as HTMLDialogElement | undefined;

		if (rateUsModal && !rateUsModal.open) {
			showModal(rateUsModal);
		}
	}
}

async function shouldShowRatingModal(user: User): Promise<boolean> {
	const now = Date.now();

	const [config, state] = await Promise.all([
		getReviewInfoConfig(),
		getReviewInfoState(),
	]);

	const {
		lastDismissTimestamp,
		lastReviewTimestamp,
		firstConnectionTimestamp = now,
		successConnectionsInRow = 0,
		milliSecondsConnectedInRow = 0,
	} = state;

	const {
		EligiblePlans = [],
		DaysLastReviewPassed = 100,
		DaysFromFirstConnection = 0,
		SuccessConnections = 2,
		DaysConnected = 3,
		DaysFromLastDismiss = 30,
	} = config;

	// Plan check
	if (!EligiblePlans.includes(user?.VPN.PlanName || 'free')) {
		return false;
	}

	// Days since last dialog dismiss (user clicked [Not now] button)
	const daysSinceLastDismiss = milliSeconds.diffInDays(lastDismissTimestamp, now);

	if (daysSinceLastDismiss < DaysFromLastDismiss) {
		return false;
	}

	// Days since last review (user clicked [Leave a rating] button)
	const daysSinceLastReview = milliSeconds.diffInDays(lastReviewTimestamp, now);

	if (daysSinceLastReview < DaysLastReviewPassed) {
		return false;
	}

	// Days since first connection
	const daysSinceFirstConnection = milliSeconds.diffInDays(firstConnectionTimestamp, now);

	if (daysSinceFirstConnection < DaysFromFirstConnection) {
		return false;
	}

	// Successful consecutive connections or days connected in row
	const enoughConnections = successConnectionsInRow >= SuccessConnections;
	const enoughDaysConnected = milliSeconds.toDays(milliSecondsConnectedInRow) >= DaysConnected;

	return enoughConnections || enoughDaysConnected;
}

export function configureRatingModalButtons() {
	const rateUsModal = document.getElementById('rate-us') as HTMLDialogElement | undefined;

	if (!rateUsModal) {
		return;
	}

	const storeButton = rateUsModal.querySelector('#store-button[data-rate-us-click=""]') as HTMLButtonElement | undefined;

	if (storeButton) {
		storeButton.dataset['rateUsClick'] = 'set';
		storeButton.addEventListener('click', () => {
			setReviewInfoState({
				lastReviewTimestamp: Date.now(),
			});
			triggerPromise(openTab(getBrowser().storeReviewsUrl));
		});
	}

	const notNowButton = rateUsModal.querySelector('#not-now-button[data-rate-us-dismiss=""]') as HTMLButtonElement | undefined;

	if (notNowButton) {
		notNowButton.dataset['rateUsDismiss'] = 'set';
		notNowButton.addEventListener('click', () => {
			setReviewInfoState({
				lastDismissTimestamp: Date.now(),
			});
		});
	}

}
