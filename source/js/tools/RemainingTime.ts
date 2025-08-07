import { clamp } from './math';
import { milliSeconds } from './milliSeconds';

/**
 * Stores the timestamp of a future event and provides a set of utility methods.
 */
export class RemainingTime {

	/**
	 * @example
	 * declare const nextTimestamp // 1 minute from now
	 * declare const prevTimestamp // 1 minute ago
	 * declare const duration      // 2 minutes
	 *
	 * const r1 = new RemainingTime(nextTimestamp) // implicit start Date.now()
	 * const r2 = new RemainingTime(nextTimestamp, duration) // 2 minutes total duration
	 * const r3 = RemainingTime.fromLastEvent(nextTimestamp, prevTimestamp) // started 1 minute ago
	 * // r3 is equivalent to r2
	 *
	 * r1.remainingTime // 60000
	 * r1.totalDuration // 60000
	 * r1.getProportion() // 0
	 *
	 * r2.remainingTime // 60000
	 * r2.totalDuration // 120000
	 * r2.getProportion() // 0.5
	 */
	constructor(
		/** Timestamp [ms] for the next event. */ public readonly nextEvent: number,
		/** *[ms]*; The total time from last event *(or creation)* until the next event. */ public readonly totalDuration: number = nextEvent - Date.now(),
	) {}

	/**
	 * Creates a new instance from the last event *(start)* timestamp instead of duration.
	 */
	public static fromLastEvent(
		/** Timestamp [ms] for the next event. */ nextEvent: number,
		/** Timestamp [ms] of the last event. *Defaults to `Date.now()`.* */ lastEvent: number = Date.now(),
	): RemainingTime {
		const duration = nextEvent - lastEvent;
		return new RemainingTime(nextEvent, duration);
	}

	/** *[ms]* */
	public get remainingTime(): number {
		return Math.max(0, this.nextEvent - Date.now());
	}

	/** Returns `false` after the event is expired. */
	public isPending(): boolean {
		return this.remainingTime > 0;
	}

	/** Returns proportion of the remaining time over a given total, between 0 and 1. */
	public getProportion(/** *[ms]* */ margin = 0, /** *[ms]* */ total: number = this.totalDuration): number {
		return clamp(0, (this.remainingTime - margin) / total, 1);
	}

	/** Returns remaining time as digits *[mm:ss]*. */
	public getChronometer() {
		const minutes = Math.trunc(milliSeconds.toMinutes(this.remainingTime));
		const seconds = Math.round(milliSeconds.toSeconds(this.remainingTime % milliSeconds.fromMinutes(1)));

		return `${this.twoDigit(minutes)}:${this.twoDigit(seconds)}` as const;
	}

	private twoDigit(value: number): string {
		return value.toString().padStart(2, '0');
	}
}
