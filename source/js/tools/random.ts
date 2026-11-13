/**
 * Generate a random (not crypto-safe) float between 0 included and 1 excluded.
 */
// nosemgrep:rules_lgpl_javascript_crypto_rule-node-insecure-random-generator
export const unsafeRandom = () => Math.random();

/**
 * Generate a random (not crypto-safe) float between min included and max excluded.
 */
export const unsafeRandomFloat = (min = 0, max = 1) =>
	min + unsafeRandom() * (max - min);

/**
 * Generate a random (not crypto-safe) integer between min included and max included.
 */
export const unsafeRandomInt = (min = 0, max = 1) =>
	Math.floor(unsafeRandomFloat(min, max + 1));

const isEmptyArray = (list: unknown[]): list is [] => list.length === 0;

/**
 * Pick an item randomly (not crypto-safe) among a non-empty list.
 */
export const unsafeRandomMandatoryPick = <T>(list: T[]): T =>
	list[Math.floor(unsafeRandom() * list.length)]!;

/**
 * Pick an item randomly (not crypto-safe) among a list.
 * Return undefined if the passed array is empty.
 */
export const unsafeRandomPick = <T>(list: T[]): T | undefined => {
	if (isEmptyArray(list)) {
		return undefined;
	}

	return unsafeRandomMandatoryPick(list);
};
