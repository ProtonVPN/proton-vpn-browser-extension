import {debug as debugEnabled} from '../config';
import {record} from './record';

type PickByValue<T, ValueType> = Pick<
	T,
	{ [Key in keyof T]-?: T[Key] extends ValueType ? Key : never }[keyof T]
>;

const sender = (type: keyof PickByValue<Console, (...params: any[]) => void>) => (...params: any[]): void => {
	if (typeof (global as any).debugEnabled === 'undefined' ? debugEnabled : (global as any).debugEnabled) {
		console[type].apply(console, params);

		record([type, ...params]);
	}
};

export const log = sender('log');
export const warn = sender('warn');
export const error = sender('error');
export const info = sender('info');
export const debug = sender('debug');
