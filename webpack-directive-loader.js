/**
 * This Webpack loader injects a check for the 'use background' or 'use popup' directives.
 * If the directive is present at top of the file, it throws an error if the code is not running in the appropriate context.
 *
 * @example // file.ts
 * 'use background';
 * import xyz from 'xyz';
 * //... the rest of the file
 */

module.exports = function (/** @type string */ source) {
	const useBackground = /^(.)use background\1/i;
	const usePopup = /^(.)use popup\1/i;
	const path = this.resourcePath.split(/[/\\]/g);
	path.pop();

	let up = './';

	for (; path.length && path.pop() !== 'js'; up += '../');

	let injected = '';

	if (useBackground.test(source)) {
		injected = template(
			'!isInBackground()',
			"'use background' directive detected in",
			up,
		);
	}

	if (usePopup.test(source)) {
		injected = template(
			'isInBackground()',
			"'use popup' directive detected in",
			up,
		);
	}

	return injected + source;
};

function template(
	/** @type string */ condition,
	/** @type string */ message,
	/** @type string */ resourcePath,
) {
	return `
import { isInBackground } from '${resourcePath}context/isInBackground';
//@ts-ignore
const fileName = import.meta.url.split('/').pop();
if (${condition}) {
	throw new Error("${message}: " + fileName);
}

`;
}
