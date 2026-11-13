'use popup';
export const configureCallback = <T = () => void>(
	name: string,
	initialValue?: T,
	once = false,
) => {
	let configured = false;
	let currentValue: T =
		initialValue ??
		((() => {
			throw new Error(`${name} is not configured`);
		}) as T);
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	const callback = ((...args: unknown[]) => currentValue(...args)) as T;

	return {
		get(): T {
			return callback;
		},
		callback,
		set(value: T) {
			if (once && configured) {
				throw new Error(`Cannot configure twice ${name}`);
			}

			configured = true;
			currentValue = value;
		},
	};
};
