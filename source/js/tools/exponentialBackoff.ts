import {Storage, storage} from './storage';
import {triggerPromise} from './triggerPromise';
import {clamp} from './math';

interface Backoff {
	increment: number;
	expiration: number;
	forget: number;
}

export const liftBackoff = (key: string): void => {
	triggerPromise(storage.removeItem('backoff-' + key, Storage.LOCAL));
};

export const isSuspended = async (key: string): Promise<boolean> => {
	const backoff = await storage.getItem<Backoff>('backoff-' + key, undefined, Storage.LOCAL);

	if (!backoff) {
		return false;
	}

	if (Date.now() > backoff.forget) {
		liftBackoff(key);

		return false;
	}

	return (Date.now() <= backoff.expiration);
};

export const suspend = (key: string, millisecondDelay: number = 5000): void => {
	triggerPromise((async () => {
		const backoff = await storage.getItem<Backoff>('backoff-' + key, undefined, Storage.LOCAL);
		const increment = (backoff?.increment || 0) + 1;
		const expiration = Date.now() + 1000 * Math.min(300, Math.pow(millisecondDelay / 1000, (1 + increment) / 2));
		const forget = Date.now() + 20000 + 1000 * clamp(15, Math.pow(millisecondDelay / 1000, (2 + increment) / 2), 600);

		await storage.setItem('backoff-' + key, {
			increment,
			expiration,
			forget,
		}, Storage.LOCAL);
	})());
};
