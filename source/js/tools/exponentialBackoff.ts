import {Storage, storage} from './storage';
import {triggerPromise} from './triggerPromise';
import {clamp} from './math';

interface Backoff {
	increment: number;
	expiration: number;
	forget: number;
}

const BACKOFF_KEY_PREFIX = 'backoff-';

const getBackoffKey = (key: string): string => BACKOFF_KEY_PREFIX + key;

const getBackoff = (key: string): Promise<Backoff | undefined> =>
	storage.getItem<Backoff>(getBackoffKey(key), undefined, Storage.LOCAL);

export const liftBackoff = (key: string): void => {
	triggerPromise(storage.removeItem(getBackoffKey(key), Storage.LOCAL));
};

export const isSuspended = async (key: string): Promise<boolean> => {
	const backoff = await getBackoff(key);

	if (!backoff) {
		return false;
	}

	if (Date.now() > backoff.forget) {
		liftBackoff(key);

		return false;
	}

	return Date.now() <= backoff.expiration;
};

const getExpiration = (millisecondDelay: number, increment: number): number =>
	Date.now() +
	1000 * Math.min(300, Math.pow(millisecondDelay / 1000, (1 + increment) / 2));

const getForget = (millisecondDelay: number, increment: number): number =>
	Date.now() +
	20000 +
	1000 * clamp(15, Math.pow(millisecondDelay / 1000, (2 + increment) / 2), 600);

export const suspend = (key: string, millisecondDelay: number = 5000): void => {
	triggerPromise(
		(async () => {
			const backoff = await getBackoff(key);
			const increment = (backoff?.increment || 0) + 1;
			const expiration = getExpiration(millisecondDelay, increment);
			const forget = getForget(millisecondDelay, increment);

			await storage.setItem(
				'backoff-' + key,
				{
					increment,
					expiration,
					forget,
				},
				Storage.LOCAL,
			);
		})(),
	);
};
