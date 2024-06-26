import {handleError} from './sentry';

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
