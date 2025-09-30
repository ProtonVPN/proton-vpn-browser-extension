import {milliSeconds} from '../tools/milliSeconds';
import {RemainingTime} from '../tools/RemainingTime';
import {triggerPromise} from '../tools/triggerPromise';
import {getChangeServerConfig as getConfig} from '../account/user/clientconfig/getClientConfig';
import type {ChangeServerConfig} from '../account/user/clientconfig/storedClientConfig';
import {getServerRotatorState as getState, setServerRotatorState as setState} from './getServerRotatorState';

/**
 * This class manages the state and UI changes for the "Change Server" functionality for free users.
 */
export class ServerRotator {

	/** *[milliseconds]* Current waiting time. For the circle percentage animation. */
	private _wait = 0;

	private _RemainingTime?: RemainingTime;

	private refChangeServerInterval?: NodeJS.Timeout;
	private intervalSubscribers = new Map</** subscriber */AnyFunction, /** unsubscriber */ AnyFunction | undefined>();

	private modalCircleEl: SVGCircleElement;
	private modalTimeEl: HTMLSpanElement;

	/* Server config - with reasonable defaults until the server responds  */

	/** *[milliseconds]* */
	private _waitShort = milliSeconds.fromSeconds(9);
	/** *[milliseconds]* */
	private _waitLong = milliSeconds.fromMinutes(20);
	/** Every n-th delay is long; */
	private _changesLimit = 4;

	/* Storage state - local copy for faster lookup */

	/** Timestamp *[ms]* for the next allowed change. */
	private _nextChange: number | undefined = undefined;

	constructor(
		public quickConnectButtonEl: HTMLDivElement,
		public modalEl: HTMLDivElement,
		public openModal: () => void,
	) {
		if (!this.quickConnectButtonEl) {
			throw new Error('[ServerRotator] quickConnectButton is not defined.');
		}

		if (!this.modalEl) {
			throw new Error('[ServerRotator] modal is not defined.');
		}

		const progressEl = this.modalEl.querySelector('.circle-progress');
		const [, svgEl, timeEl] = (progressEl!.children) as unknown as [HTMLDivElement, SVGElement, HTMLSpanElement];

		this.modalCircleEl = svgEl.children[0] as SVGCircleElement;
		this.modalTimeEl = timeEl;

		getConfig().then(config => this.loadConfig(config));
	}

	/** Uses chrome storage shared across tabs to get the pending state. */
	public async isPending(): Promise<boolean> {
		const nextChange = this._nextChange ?? (await getState()).nextChange ?? 0;

		return (nextChange - Date.now()) > 0;
	}

	/**
	 * Start a new counter if not already running and increase the count of free changes.
	 * @param wait - Milliseconds to wait before the next change. If not provided, it will use the default short or long wait time based on counted changes.
	 */
	public async startCountdown(/** *[milliseconds]* */wait?: number): Promise<void> {
		if (this.refChangeServerInterval) {
			return;
		}

		const nextChange = await this.setNextChange(wait);
		this._RemainingTime = new RemainingTime(nextChange, wait);
		this.startCountdownRefreshing();
	}

	/**
	 * Resume the counter if it is not already running (e.g. after a page reload or in a separate tab).
	 * It will start from the last and next change timestamps stored in the state.
	 */
	public async resumeCountdown(): Promise<void> {
		if (this.refChangeServerInterval) {
			return;
		}

		const { nextChange = 0, changesCount = 0 } = await getState();

		if (nextChange > Date.now()) {
			this._wait = changesCount % this._changesLimit ? this._waitShort : this._waitLong;
			this._nextChange = nextChange;
			this._RemainingTime = new RemainingTime(nextChange, this._wait);
			this.startCountdownRefreshing();
		}
	}

	private startCountdownRefreshing(): void {
		this.refChangeServerInterval = setInterval(
			() => this.refreshCountDown(),
			milliSeconds.fromSeconds(1),
		);
		this.refreshCountDown();
		this.renderQuickConnectButtonTime();
	}

	private refreshCountDown(): void {
		this.runIntervalCallbacks();

		if (!this._RemainingTime!.isPending()) {
			this.stopCountdown();
		}
	}

	private loadConfig(config: ChangeServerConfig): void {
		this._waitShort = milliSeconds.fromSeconds(config.ChangeServerShortDelayInSeconds);
		this._waitLong = milliSeconds.fromSeconds(config.ChangeServerLongDelayInSeconds);
		this._changesLimit = config.ChangeServerAttemptLimit;
	}

	private stopCountdown(): void {
		if (this.refChangeServerInterval) {
			this._nextChange = undefined;
			this._RemainingTime = undefined;
			this.renderQuickConnectButtonTime();
			clearInterval(this.refChangeServerInterval);
			this.refChangeServerInterval = undefined;

			this.unsubscribeFromInterval();
		}
	}

	public async refreshState(canDisconnectOrCancel: boolean): Promise<void> {
		if (!await this.isPending()) {
			return;
		}

		if (!canDisconnectOrCancel) {
			this.unsubscribeFromInterval();

			return;
		}

		await this.resumeCountdown();
		this.subscribeToInterval(this.renderQuickConnectButtonTime, this.clearQuickConnectButtonTime);
	}

	public showModal(): void {
		this.openModal?.();

		// Start the animation without transition to avoid change of pace, then start the transition.
		this.renderModalTime(-1);
		setTimeout(() => {
			this.modalCircleEl.classList.add('transition');
			this.renderModalTime(0);
		});
		this.subscribeToInterval(this.renderModalTime);

		// Detect when modal is closed by removed class event and unsubscribe from the interval.
		const observer = new MutationObserver(() => {
			if (!this.modalEl.classList.contains('selected-page')) {
				this.modalCircleEl.classList.remove('transition');
				this.unsubscribeFromInterval(this.renderModalTime);
				observer.disconnect();
			}
		});

		observer.observe(this.modalEl!, {
			attributes: true,
			attributeFilter: ['class'],
		});
	}

	private async setNextChange(/** *[milliseconds]* */wait?: number): Promise<number> {
		const changesCount = 1 + ((await getState()).changesCount ?? 0);
		this._wait = wait ?? changesCount % this._changesLimit ? this._waitShort : this._waitLong;
		this._nextChange = Date.now() + this._wait;
		triggerPromise(setState({ changesCount, nextChange: this._nextChange }));
		return this._nextChange;
	}

	private subscribeToInterval(callback: AnyFunction, clearCallback?: AnyFunction) {
		this.intervalSubscribers.set(callback, clearCallback);
	}

	private unsubscribeFromInterval(callback?: AnyFunction) {
		if (callback) {
			this.intervalSubscribers.get(callback)?.call(this); // calling unsubscriber()
			this.intervalSubscribers.delete(callback);

			return;
		}
		this.intervalSubscribers.forEach(unsubscriber => unsubscriber?.call(this));
		this.intervalSubscribers.clear();
	}

	private runIntervalCallbacks() {
		this.intervalSubscribers.forEach((_unsubscriber, callback) => callback.call(this));
	}

	/** Render remaining time in the quickConnectButton. */
	private renderQuickConnectButtonTime() {
		this.quickConnectButtonEl.dataset['nextChange'] = this._RemainingTime?.getChronometer() || '';
	};

	private clearQuickConnectButtonTime() {
		this.quickConnectButtonEl.dataset['nextChange'] = '';
	};

	/** Render remaining time in the modal. */
	private renderModalTime(/** Make the proportion artificially +longer/-shorter to better match the chronometer. */offsetSeconds = 1) {
		const maxCircleCircumference = 252;

		this.modalCircleEl.style.strokeDashoffset = (this._RemainingTime!.getProportion(milliSeconds.fromSeconds(offsetSeconds)) * maxCircleCircumference).toString();
		this.modalTimeEl!.innerHTML = this._RemainingTime!.getChronometer();
	};

}

type AnyFunction = () => void;
