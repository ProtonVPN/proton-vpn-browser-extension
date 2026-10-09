export const encodeBase64 = (input: string) => btoa(input).trim();
export const decodeBase64 = (input: string) => atob(input.trim());

/**
 * Encodes given string in URL-safe Base64.
 * @param str String that is to be encoded.
 * @param removePadding Whether to remove padding (true by default);
 */
export const encodeBase64URL = (str: string, removePadding = true): string => {
	const base64String = encodeBase64(str)
		.replace(/\+/g, '-')
		.replace(/\//g, '_');

	return removePadding ? base64String.replace(/=/g, '') : base64String;
};

/**
 * Decodes given Base64URL string.
 * @param str String that is to be decoded.
 */
export const decodeBase64URL = (str: string): string =>
	decodeBase64(str.replace(/-/g, '+').replace(/_/g, '/'));

export const binaryStringToArray = (str: string) => {
	const result = new Uint8Array(str.length);
	for (let i = 0; i < str.length; i++) {
		result[i] = str.charCodeAt(i);
	}
	return result;
};

/**
 * Converts Uint8Array (= Array of unsigned 8-bit integer bytes) into a binary string.
 * @param bytes Uint8Array that is to be converted.
 */
export const arrayToBinaryString = (bytes: Uint8Array): string => {
	const result = [];
	const bs = 1 << 14;
	const j = bytes.length;

	for (let i = 0; i < j; i += bs) {
		result.push(
			String.fromCharCode(
				...Array.from(bytes.subarray(i, i + bs < j ? i + bs : j)),
			),
		);
	}
	return result.join('');
};
