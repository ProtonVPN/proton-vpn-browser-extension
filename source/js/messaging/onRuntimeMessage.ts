import {getRuntime} from '../tools/getRuntime';
import type {BackgroundData} from './MessageType';
import type {ConnectionState} from '../vpn/ConnectionState';
import type {PmUser} from '../account/user/PmUser';
import type {User} from '../account/user/User';

interface BackgroundObjects {
	[BackgroundData.USER]: {
		[BackgroundData.USER]: User | undefined;
		planChanged: boolean;
	};
	[BackgroundData.PM_USER]: {
		[BackgroundData.PM_USER]: PmUser | undefined;
	};
	[BackgroundData.STATE]: {
		[BackgroundData.STATE]: ConnectionState['data'];
	};
}

type Listener<T extends BackgroundData> = (
	data: (T extends keyof BackgroundObjects
		? BackgroundObjects[T]
		: Record<string, unknown>) & {event: T},
) => void;

type Listeners = {[T in BackgroundData]?: Listener<T>};

const addListeners = (listeners: Listeners) => {
	getRuntime()?.onMessage.addListener((message: {event?: BackgroundData}) => {
		const type = message?.event as BackgroundData;
		(listeners[type] as ((data: unknown) => void) | undefined)?.(message);

		return false;
	});
};

const isListenersObject = (listeners: unknown): listeners is Listeners =>
	typeof listeners === 'object';

export function onRuntimeMessage<T extends BackgroundData>(
	type: T,
	callback: Listener<T>,
): void;
export function onRuntimeMessage(listeners: Listeners): void;
export function onRuntimeMessage<T extends BackgroundData>(
	listeners: T | Listeners,
	callback?: Listener<T>,
): void {
	addListeners(
		isListenersObject(listeners)
			? listeners
			: ({[listeners]: callback} as Listeners),
	);
}
