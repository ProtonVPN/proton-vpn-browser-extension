/**
 * Use `'use background';` or `'use popup';` directive at the top of the file to indicate the context in which the code should run.
 *
 * See `webpack-directive-loader.js` and `webpack.config.js` changes from this commit for more details.
 *
 * - [webpack-directive-loader.js](../../../webpack-directive-loader.js)
 * - [webpack.config.js](../../../webpack.config.js)
 *
 * @example // file.ts
 * 'use background';
 * import xyz from 'xyz';
 * //... the rest of the file
 */

export const isInBackground = () => (
	typeof window === 'undefined' ||
	window.location.href.indexOf('_generated_background_page.html') !== -1
);
