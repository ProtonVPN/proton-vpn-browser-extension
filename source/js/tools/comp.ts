export const comp = (a: any, b: any) => {
	if (typeof a === 'string' && typeof b === 'string') {
		return a.localeCompare(b);
	}

	if (a > b) {
		return 1;
	}

	if (a < b) {
		return -1;
	}

	return 0;
};

export class Sorter<
	V,
	S,
> {
	private sortingCallbacks: ((a: S | undefined, b: S | undefined) => number)[] = [];

	constructor(private readonly transformer?: (value: V, ...args: any[]) => S | undefined) {
	}

	private getField(value: V, ...args: any[]): S | undefined {
		return (this.transformer
			? this.transformer(value, ...args)
			: value
		) as S | undefined;
	}

	public sort(list: V[], ...args: any[]): void {
		if (this.sortingCallbacks.length) {
			list.sort((a, b) => {
				const aValue = this.getField(a, ...args);
				const bValue = this.getField(b, ...args);
				let result = 0;

				this.sortingCallbacks.some(callback => {
					return (result = callback(aValue, bValue));
				});

				return result;
			});
		}
	}

	public asc(key: keyof S): this {
		this.sortingCallbacks.push((a, b) => comp(a?.[key], b?.[key]));

		return this;
	}

	public desc(key: keyof S): this {
		this.sortingCallbacks.push((a, b) => comp(b?.[key], a?.[key]));

		return this;
	}
}
