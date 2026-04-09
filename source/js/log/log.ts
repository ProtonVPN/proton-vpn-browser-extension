import {debug as debugEnabled} from '../config';
import {record} from './record';

type PickByValue<T, ValueType> = Pick<
	T,
	{[Key in keyof T]-?: T[Key] extends ValueType ? Key : never}[keyof T]
>;

const sender =
	(type: keyof PickByValue<Console, Logger>) =>
	(...params: unknown[]): void => {
		if (
			typeof (global as {debugEnabled?: boolean}).debugEnabled === 'undefined'
				? debugEnabled
				: (global as {debugEnabled?: boolean}).debugEnabled
		) {
			// eslint-disable-next-line prefer-spread
			console[type].apply(console, params);

			record([type, ...params]);
		}
	};

type Logger = (...params: unknown[]) => void;

export const log: Logger = sender('log');
export const warn: Logger = sender('warn');
export const error: Logger = sender('error');
export const info: Logger = sender('info');
export const debug: Logger = sender('debug');

/**
 * @example
 * import {debug as debug_, bind} from '../log/log';
 * const debug = bind(debug_, '[myModule]');
 */
export function bind(
	logger: Logger,
	prefix: string,
	...args: unknown[]
): Logger {
	return logger.bind(logger, prefix, ...args);
}
