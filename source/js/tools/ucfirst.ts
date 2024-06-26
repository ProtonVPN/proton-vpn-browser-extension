export const ucfirst = (value: any) => (typeof value === 'string' && value.length >= 1)
	? value.substring(0, 1).toUpperCase() + value.substring(1)
	: value;
