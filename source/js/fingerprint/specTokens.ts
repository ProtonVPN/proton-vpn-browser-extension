/**
 * ⚠ No import here: this module is also loaded by webpack.config.ts to
 * generate one static file per token (see specEncoding.ts).
 */

/** Transient global the token files push to, deleted by fingerprint.js */
export const specGlobalName = '__protonVpnFingerprint';

/** Up to 1000 known values per encoded field */
export const specDigits = 3;

/** Canvas noise seed, 1 000 000 possible values (mixed with the origin) */
export const specSeedDigits = 6;

/** Must match fingerprintGroups.length (checked by tests) */
export const specGroupCount = 7;

export const specTokenDirectory = 'js/fp/';

/** Field prefix => number of digits */
export const specFields: Record<string, number> = {
	t: specDigits,
	l: specDigits,
	s: specSeedDigits,
};

export const getAllSpecTokens = (): string[] => {
	const tokens: string[] = [];

	for (let group = 0; group < specGroupCount; group++) {
		tokens.push(`g${group}`);
	}

	Object.entries(specFields).forEach(([field, digits]) => {
		for (let position = 0; position < digits; position++) {
			for (let digit = 0; digit < 10; digit++) {
				tokens.push(`${field}${position}_${digit}`);
			}
		}
	});

	return tokens;
};

export const getSpecTokenSource = (token: string): string =>
	`(self.${specGlobalName}||(self.${specGlobalName}=[])).push(${JSON.stringify(token)});\n`;
