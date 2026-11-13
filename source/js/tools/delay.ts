import {unsafeRandomFloat} from './random';

export const setJitterTimeout = <TArgs extends unknown[]>(
	milliSeconds: number,
	jitterMilliSeconds: number,
	callback: (...args: TArgs) => void,
	...args: TArgs
): NodeJS.Timeout => {
	if (jitterMilliSeconds) {
		milliSeconds += Math.round(jitterMilliSeconds * unsafeRandomFloat(-1, 1));
	}

	return setTimeout(callback, milliSeconds, ...args);
};

export const delay = (milliSeconds: number, jitterMilliSeconds = 0) =>
	new Promise<void>((resolve) => {
		setJitterTimeout(milliSeconds, jitterMilliSeconds, resolve);
	});

export const timeoutAfter = <T>(
	promise: Promise<T>,
	maxMilliSeconds: number,
	message?: string,
	errorType: new (message: string) => Error = Error,
) =>
	new Promise<T>((resolve, reject) => {
		let timedOut = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			reject(new errorType(message || 'Timeout'));
		}, maxMilliSeconds);

		promise
			.then((result) => {
				if (!timedOut) {
					resolve(result);
					clearTimeout(timeout);
				}
			})
			.catch(reject);
	});

export const setJitterInterval = <TArgs extends unknown[]>(
	milliSeconds: number,
	jitterMilliSeconds: number,
	callback: (...args: TArgs) => void,
	...args: TArgs
) => {
	let timeout: NodeJS.Timeout | undefined = undefined;

	const run = () => {
		timeout = setJitterTimeout(milliSeconds, jitterMilliSeconds, () => {
			callback(...args);
			run();
		});
	};

	run();

	return {
		clear(): void {
			clearTimeout(timeout);
		},
	};
};
