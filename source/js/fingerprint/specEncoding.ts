import type {FingerprintSpec} from './buildSpoofedProfile';
import {fingerprintGroups} from './FingerprintGroup';
import {getKnownLanguages} from './getCountryLanguage';
import {getKnownTimezones} from './getServerTimezone';
import {specFields, specTokenDirectory} from './specTokens';

/**
 * Content scripts registered with scripting.registerContentScripts() are
 * the only way to run before page scripts, but they can't receive any
 * argument, so the spec is encoded as a list of tiny static files (built
 * by webpack, see webpack.config.ts), each one pushing its token to a
 * transient global that fingerprint.js reads and deletes before any page
 * script can see it.
 *
 * A given file only runs once per registration, so each token is unique:
 * - t<position>_<digit>: digits of the timezone index in getKnownTimezones()
 * - l<position>_<digit>: digits of the language index in getKnownLanguages()
 * - s<position>_<digit>: digits of the canvas noise seed
 * - g<index>: index of an enabled group in fingerprintGroups
 */
export {specGlobalName} from './specTokens';

const encodeIndex = (prefix: string, index: number): string[] => {
	const digits = String(index).padStart(specFields[prefix] ?? 0, '0');

	return digits
		.split('')
		.map((digit, position) => `${prefix}${position}_${digit}`);
};

const decodeIndex = (prefix: string, tokens: string[]): number | undefined => {
	const digits: string[] = [];

	tokens.forEach((token) => {
		const match = new RegExp(`^${prefix}(\\d)_(\\d)$`).exec(token);

		if (match) {
			digits[Number(match[1])] = match[2] as string;
		}
	});

	return digits.length ? Number(digits.join('')) : undefined;
};

export const encodeSpec = (spec: FingerprintSpec): string[] => {
	const tokens = spec.groups.map(
		(group) => `g${fingerprintGroups.indexOf(group)}`,
	);
	const timezoneIndex = spec.timezone
		? getKnownTimezones().indexOf(spec.timezone)
		: -1;
	const languageIndex = spec.language
		? getKnownLanguages().indexOf(spec.language)
		: -1;

	if (timezoneIndex >= 0) {
		tokens.push(...encodeIndex('t', timezoneIndex));
	}

	if (languageIndex >= 0) {
		tokens.push(...encodeIndex('l', languageIndex));
	}

	if (spec.seed !== undefined) {
		tokens.push(...encodeIndex('s', spec.seed));
	}

	return tokens;
};

export const decodeSpec = (tokens: string[]): FingerprintSpec | undefined => {
	const groups = fingerprintGroups.filter((_, index) =>
		tokens.includes(`g${index}`),
	);
	const timezoneIndex = decodeIndex('t', tokens);
	const languageIndex = decodeIndex('l', tokens);
	const seed = decodeIndex('s', tokens);
	const spec: FingerprintSpec = {groups};

	if (timezoneIndex !== undefined) {
		spec.timezone = getKnownTimezones()[timezoneIndex];
	}

	if (languageIndex !== undefined) {
		spec.language = getKnownLanguages()[languageIndex];
	}

	if (seed !== undefined) {
		spec.seed = seed;
	}

	return groups.length ? spec : undefined;
};

export const getSpecFiles = (spec: FingerprintSpec): string[] =>
	encodeSpec(spec).map((token) => `${specTokenDirectory}${token}.js`);
