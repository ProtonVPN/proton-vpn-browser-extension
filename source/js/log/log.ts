import {debug as debugEnabled} from '../config';
import {record} from './record';

type PickByValue<T, ValueType> = Pick<
	T,
	{ [Key in keyof T]-?: T[Key] extends ValueType ? Key : never }[keyof T]
>;

const sender = (type: keyof PickByValue<Console, Logger>) => (...params: any[]): void => {
	if (typeof (global as any).debugEnabled === 'undefined' ? debugEnabled : (global as any).debugEnabled) {
		console[type].apply(console, params);

		record([type, ...params]);
	}
};

type Logger = (...params: any[]) => void;

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
export function bind(logger: Logger, prefix: string, ...args: any): Logger {
	return logger.bind(logger, prefix, ...args);
}
