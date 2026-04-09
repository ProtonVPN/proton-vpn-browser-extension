import {handleError} from './sentry';

/**
 * This intentionally doesn't return anything as it is supposed to be
 * the last wrapping piece of a promise chain that should not be continued or awaited.
 */
export const triggerPromise = (actionResult: unknown) => {
	if (typeof (actionResult as Promise<unknown>)?.then === 'function') {
		(actionResult as Promise<unknown>).then(() => {
			/* noop */
		}, handleError);
	}
};

export const catchPromise = (actionResult: unknown) => {
	if (typeof (actionResult as Promise<unknown>)?.catch === 'function') {
		(actionResult as Promise<unknown>).catch(() => {
			/* noop */
		});
	}
};
