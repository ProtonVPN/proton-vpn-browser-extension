/// <reference types="firefox-webext-browser"/>
import {dirname, join, resolve} from 'path';
import {fileURLToPath} from 'url';
import {CleanWebpackPlugin} from 'clean-webpack-plugin';
import type {Pattern} from 'copy-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import type {Compiler} from 'webpack';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import {baseDomainURL} from './config.ts';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import * as specTokens from './source/js/fingerprint/specTokens.ts';

type ManifestV3 = chrome.runtime.ManifestV3;
type WebExtensionManifest = browser._manifest.WebExtensionManifest;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function (
	_: unknown,
	argv: {mode: string},
	options?: {distribution?: string; gecko?: boolean},
) {
	if (!options) {
		options = {};
	}

	const copy: Pattern[] = [
		{
			from: '**/*',
			context: 'source',
			globOptions: {
				ignore: [
					'**/*.scss',
					'**/*.js',
					'**/*.ts',
					'**/*.js.map',
					'**/locales/*.po',
					'**/locales/.locale-state.metadata',
					'**/locales/config/locales.json',
					// Only Firefox declares options_ui (see adaptToFirefox)
					...(options.gecko ? [] : ['**/options.html']),
				],
			},
		},
		{
			from: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
			to: 'js',
		},
		{
			from: 'onboarding.html',
			context: 'source',
		},
	];

	const dev = argv.mode === 'development' || argv.mode === 'test';

	const adaptToFirefox = (manifest: WebExtensionManifest) => {
		manifest.browser_specific_settings = {
			gecko: {
				id: 'vpn@proton.ch',
				strict_min_version: '109.0',
			},
		};
		manifest.optional_permissions = ['proxy'];
		// Embedded options page: runtime.openOptionsPage() then lands in
		// about:addons on the extension page, one tab away from the
		// "Run in Private Windows" setting (about:addons can't be opened directly).
		manifest.options_ui = {
			page: 'options.html',
			open_in_tab: false,
		};
		manifest.content_scripts = [
			{
				all_frames: true,
				js: ['js/transmit.js'],
				matches: [
					'https://account.protonvpn.com/*',
					baseDomainURL + '/*',
					...(dev
						? ['http://localhost:8080/*', 'https://account.proton.black/*']
						: []),
				],
				run_at: 'document_start',
			},
		];
		manifest.background = {
			scripts: ['js/browser-polyfill.min.js', 'js/background.js'],
		};
		manifest.permissions = manifest.permissions!.filter(
			(permission) =>
				permission !== 'webRequestAuthProvider' && permission !== 'proxy',
		);
		manifest.permissions.push('activeTab', 'webRequestBlocking');
		delete (manifest as ManifestV3).key;
		delete (manifest as ManifestV3).externally_connectable;
	};

	const adaptToChromium = (manifest: ManifestV3) => {
		// Chrome only gates Tab.url/title/favIconUrl behind "tabs", and our
		// host_permissions already expose them for web pages.
		manifest.permissions = manifest.permissions!.filter(
			(permission) => permission !== 'tabs',
		);

		const matches = (manifest.externally_connectable || {}).matches || [];

		if (matches.length && matches.indexOf(baseDomainURL + '/*') === -1) {
			manifest.externally_connectable!.matches!.push(baseDomainURL + '/*');
		}
	};

	const manifestTransformations = [
		options.gecko ? adaptToFirefox : adaptToChromium,
	];

	if (manifestTransformations.length) {
		copy.unshift({
			from: 'manifest.json',
			context: 'source',
			transform: (content) => {
				const manifest = JSON.parse(content.toString());

				manifestTransformations.forEach((transformation) => {
					transformation(manifest);
				});

				return JSON.stringify(manifest, null, '\t');
			},
		});
	}

	const plugins: {apply(compiler: Compiler): void}[] = [
		new CopyWebpackPlugin({
			patterns: copy,
		}),
		{
			// Static files encoding the fingerprint spec (see specEncoding.ts)
			apply(compiler: Compiler) {
				compiler.hooks.thisCompilation.tap(
					'FingerprintTokens',
					(compilation) => {
						compilation.hooks.processAssets.tap(
							{
								name: 'FingerprintTokens',
								stage:
									compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
							},
							() => {
								(specTokens.getAllSpecTokens() as string[]).forEach((token) => {
									compilation.emitAsset(
										`${specTokens.specTokenDirectory}${token}.js`,
										new compiler.webpack.sources.RawSource(
											specTokens.getSpecTokenSource(token),
										),
									);
								});
							},
						);
					},
				);
			},
		},
		new MiniCssExtractPlugin({
			filename: '[name].css',
			chunkFilename: '[id].css',
		}),
	];

	const minimizers: {apply(compiler: Compiler): void}[] = [
		new TerserPlugin({
			terserOptions: {
				mangle: !dev,
				compress: !dev,
				format: {
					beautify: dev,
					indent_level: dev ? 2 : undefined,
					comments: dev ? 'all' : false,
				},
			},
		}),
	];

	if (!dev) {
		plugins.unshift(new CleanWebpackPlugin());
		minimizers.push(new CssMinimizerPlugin());
	}

	return {
		target: ['web', 'es5'],
		stats: dev ? 'minimal' : 'errors-only',
		entry: {
			service: './source/js/service.ts',
			background: './source/js/background.ts',
			onboarding: './source/js/onboarding.ts',
			options: './source/js/options.ts',
			popup: './source/js/popup.ts',
			fingerprint: './source/js/fingerprint.ts',
			'fingerprint-relay': './source/js/fingerprint-relay.ts',
			transmit: './source/js/transmit.ts',
			['css/popup']: './source/css/popup.scss',
			['css/onboarding']: './source/css/onboarding.scss',
			['css/options']: './source/css/options.scss',
		},
		resolve: {
			tsconfig: true,
			extensions: ['.tsx', '.ts', '.jsx', '.js'],
			modules: [resolve(__dirname, 'source'), 'node_modules'],
		},
		output: {
			path: join(__dirname, options.distribution || 'distribution'),
			filename: 'js/[name].js',
		},
		plugins: plugins,
		optimization: {
			minimize: !dev,
			minimizer: minimizers,
		},
		module: {
			rules: [
				...(dev
					? [
							{
								test: /\.(js|jsx|ts|tsx)$/,
								enforce: 'pre' as const,
								loader: resolve(__dirname, 'webpack-directive-loader.ts'),
								exclude: /node_modules/,
							},
						]
					: []),
				{
					test: /\.(js|jsx|ts|tsx)$/,
					loader: 'ts-loader',
					exclude: /node_modules/,
					options: {
						compilerOptions: {
							// Bundles need no .d.ts, and with noEmitOnError, declaration
							// diagnostics run for each file (~3 min vs ~30 s per build)
							declaration: false,
						},
					},
				},
				{
					test: /\.js$/,
					loader: 'babel-loader',
					exclude: /node_modules/,
				},
				{
					test: /\.s[ac]ss$/i,
					use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
				},
			],
		},
		...(dev ? {devtool: 'source-map'} : {}),
	};
}
