export const getKeysAndValues = <T>(data: T) => Object.keys(data as object).map(key => ({
	key: key as keyof T,
	value: data[key as keyof T],
}));
