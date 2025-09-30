import {handleError} from './sentry';

/**
 * This intentionally doesn't return anything as it is supposed to be
 * the last wrapping piece of a promise chain that should not be continued or awaited.
 */
export const triggerPromise = (actionResult: any) => {
	if (typeof actionResult?.then === 'function') {
		(actionResult as Promise<any>).then(
			() => {/* noop */},
			handleError,
		);
	}
};

export const catchPromise = (actionResult: any) => {
	if (typeof actionResult?.catch === 'function') {
		(actionResult as Promise<any>).catch(() => {/* noop */});
	}
};
