import {milliSeconds} from '../tools/milliSeconds';
import {Storage, storage} from '../tools/storage';
import {tokenDuration} from '../../../config';

/**
 * The transitive state that needs to be synchronized across browsers for the review prompt functionality.
 * Note: We want to synchronize this state across browsers, not just tabs, because the review modal suggestion is a one-time(-ish) action that should not be repeated in different browsers where the user is signed in.
 */
export interface ReviewInfoState {
	/** Last time the user pressed [Leave a rating] modal button. */
	lastReviewTimestamp: number;
	/** Last time the user dismissed the rating modal [Not now]. */
	lastDismissTimestamp: number;
	firstConnectionTimestamp: number | undefined;
	successConnectionsInRow: number;
	/** Count of successful seconds (not consecutive), resets on error. */
	milliSecondsConnectedInRow: number;
	/** This date resets on error. Companion for `milliSecondsConnectedInRow`. */
	lastSeenConnectedTimestamp: number | undefined;
}

const reviewInfoState = storage.item<ReviewInfoState>('review-info', Storage.SYNC);

export const getReviewInfoState = async (): Promise<ReviewInfoState> => ({
	lastReviewTimestamp: 0,
	lastDismissTimestamp: 0,
	firstConnectionTimestamp: undefined,
	successConnectionsInRow: 0,
	milliSecondsConnectedInRow: 0,
	lastSeenConnectedTimestamp: undefined,
	...(await reviewInfoState.get() ?? {}),
});

const getNextValueForMilliSecondsConnectedInRow = (
	milliSecondsConnectedInRow: number,
	lastSeenConnectedTimestamp: number,
	now: number,
) => {
	if (!lastSeenConnectedTimestamp) {
		return 0;
	}

	const milliSecondsSinceLastSeen = milliSeconds.diffInMilliSeconds(lastSeenConnectedTimestamp, now);

	// We consider it "in row"
	if (milliSeconds.toSeconds(milliSecondsSinceLastSeen) < tokenDuration) {
		// => add the whole interval as time being connected
		return milliSecondsConnectedInRow + milliSecondsSinceLastSeen;
	}

	// Below 48 hours, we consider it a pause
	// BEX is not expected to be installed on devices being switched on 24/7
	// So we apply a relaxed version of the "days connected in row"
	if (milliSeconds.toDays(milliSecondsSinceLastSeen) < 2) {
		// => we keep current value without increasing the counter
		return milliSecondsConnectedInRow;
	}

	// Over 48 hours, then we reset the counter to 0
	return 0;
};

export async function setReviewInfoState(partialState: Partial<ReviewInfoState>): Promise<void>;
export async function setReviewInfoState(updater: (prevState: ReviewInfoState) => Partial<ReviewInfoState>): Promise<void>;
export async function setReviewInfoState(partialStateOrUpdater: Partial<ReviewInfoState> | ((prevState: ReviewInfoState) => Partial<ReviewInfoState>)): Promise<void> {
	return getReviewInfoState().then(prevState => reviewInfoState.set({
		...prevState,
		...(partialStateOrUpdater instanceof Function ? partialStateOrUpdater(prevState!) : partialStateOrUpdater || {}),
	}));
}

export async function setReviewInfoStateLastSeenConnected() {
	const now = Date.now();

	return setReviewInfoState(({
		milliSecondsConnectedInRow = 0,
		lastSeenConnectedTimestamp = 0,
	}) => ({
		milliSecondsConnectedInRow: getNextValueForMilliSecondsConnectedInRow(
			milliSecondsConnectedInRow,
			lastSeenConnectedTimestamp,
			now,
		),
		lastSeenConnectedTimestamp: now,
	}));
}

export async function setReviewInfoStateOnConnectAction() {
	return setReviewInfoState(({
		firstConnectionTimestamp = Date.now(),
		successConnectionsInRow = 0,
	}) => ({
		firstConnectionTimestamp,
		successConnectionsInRow: successConnectionsInRow + 1,
	}));
}

export async function setReviewInfoStateOnFailedConnection() {
	return setReviewInfoState(({
		successConnectionsInRow: 0,
		milliSecondsConnectedInRow: 0,
		lastSeenConnectedTimestamp: undefined,
	}));
}
