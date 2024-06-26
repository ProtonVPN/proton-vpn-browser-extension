export const encodeBase64 = (input: string) => btoa(input).trim();
export const decodeBase64 = (input: string) => atob(input.trim());

export const encodeBase64URL = (str: string, removePadding = true) => {
	const base64String = encodeBase64(str).replace(/\+/g, '-').replace(/\//g, '_');

	return removePadding ? base64String.replace(/=/g, '') : base64String;
};

export const decodeBase64URL = (str: string) => decodeBase64(
	str.replace(/-/g, '+').replace(/_/g, '/'),
);

export const binaryStringToArray = (str: string) => {
	const result = new Uint8Array(str.length);
	for (let i = 0; i < str.length; i++) {
		result[i] = str.charCodeAt(i);
	}
	return result;
};

export const arrayToBinaryString = (bytes: Uint8Array) => {
	const result = [];
	const bs = 1 << 14;
	const j = bytes.length;

	for (let i = 0; i < j; i += bs) {
		// @ts-ignore Uint8Array treated as number[]
		result.push(String.fromCharCode.apply(String, bytes.subarray(i, i + bs < j ? i + bs : j)));
	}
	return result.join('');
};
