export const milliSeconds = {
	fromSeconds(seconds: number, initialTime?: number) {
		return (initialTime || 0) + seconds * 1000;
	},
	fromMinutes(minutes: number, initialTime?: number) {
		return minutes * this.fromSeconds(60, initialTime);
	},
	fromHours(hours: number, initialTime?: number) {
		return hours * this.fromMinutes(60, initialTime);
	},
	fromDays(days: number, initialTime?: number) {
		return days * this.fromHours(24, initialTime);
	},
	toSeconds(milliSeconds: number) {
		return milliSeconds / 1000;
	},
	toMinutes(milliSeconds: number) {
		return this.toSeconds(milliSeconds) / 60;
	},
	toHours(milliSeconds: number) {
		return this.toMinutes(milliSeconds) / 60;
	},
	toDays(milliSeconds: number) {
		return this.toHours(milliSeconds) / 24;
	},
	diffInMilliSeconds(milliSecondTimestamp?: number, now?: number) {
		return (now || Date.now()) - (milliSecondTimestamp || 0);
	},
	diffInSeconds(milliSecondTimestamp?: number) {
		return this.toSeconds(this.diffInMilliSeconds(milliSecondTimestamp));
	},
	diffInMinutes(milliSecondTimestamp?: number) {
		return this.toMinutes(this.diffInMilliSeconds(milliSecondTimestamp));
	},
	diffInHours(milliSecondTimestamp?: number) {
		return this.toHours(this.diffInMilliSeconds(milliSecondTimestamp));
	},
	diffInDays(milliSecondTimestamp?: number) {
		return this.toDays(this.diffInMilliSeconds(milliSecondTimestamp));
	},
};
