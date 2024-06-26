const isNonEmptyString = (value: any): value is string => {
	return typeof value === 'string' && value !== '';
};

export const appendUrlParams = (
	url: string,
	urlParams: Record<string, string|number|undefined> = {},
	hashParams: Record<string, string|number|undefined> = {},
): string => {
	const hashSplit = url.split('#', 2) as [string, string|undefined];
	let hash = hashSplit[1] || '';
	const paramSplit = hashSplit[0].split('?', 2) as [string, string|undefined];
	let params = paramSplit[1] || '';

	Object.keys(urlParams).forEach(name => {
		const value = urlParams[name];

		if (typeof value === 'number' || isNonEmptyString(value)) {
			params += (params === '' ? '' : '&') + encodeURIComponent(name) + '=' + encodeURIComponent(value);
		}
	});

	Object.keys(hashParams).forEach(name => {
		const value = urlParams[name];

		if (typeof value === 'number' || isNonEmptyString(value)) {
			hash += (params === '' ? '' : '&') + encodeURIComponent(name) + '=' + encodeURIComponent(value);
		}
	});

	return paramSplit[0] + (params === '' ? '' : '?' + params) + (hash === '' ? '' : '#' + hash);
};
