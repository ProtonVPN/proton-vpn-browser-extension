interface Group<T> {
	[index: string]: T[];
}

interface GroupWithValue<T, K extends string & keyof T> {
	value: T[K];
	items: T[];
}

export function groupBy<T, K extends string & keyof T>(items: T[], key: K): Group<T> {
	const values = {} as Group<T>;

	items.forEach(item => {
		const value = `${item[key]}`;
		(values[value] || (values[value] = [])).push(item);
	});

	return values;
}

export function groupByAsArray<T, K extends string & keyof T>(items: T[], key: keyof T): GroupWithValue<T, K>[] {
	const values = {} as Record<string, GroupWithValue<T, K>>;

	items.forEach(item => {
		const value = item[key] as T[K];
		const stringValue = `${value}`;
		(values[stringValue] || (values[stringValue] = {
			value,
			items: [],
		})).items.push(item);
	});

	return Object.values(values);
}
