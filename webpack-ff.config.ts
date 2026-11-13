// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import webpackConfig from './webpack.config.ts';

export default (env: unknown, argv: {mode: string}) =>
	webpackConfig(env, argv, {
		gecko: true,
		distribution: 'distribution-ff',
	});
