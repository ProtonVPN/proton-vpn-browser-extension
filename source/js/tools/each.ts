export const each = <T>(data: T, callback: (key: keyof T, value: T[keyof T]) => void) => {
	Object.keys(data as object).forEach(key => {
		callback(key as keyof T, data[key as keyof T]);
	});
};
