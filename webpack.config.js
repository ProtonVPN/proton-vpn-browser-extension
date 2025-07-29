const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const {baseDomainURL} = require('./config');

module.exports = (env, argv, options) => {
	options || (options = {});

	const copy = [
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
				],
			},
		},
		{
			from: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
			to: 'js',
		},
		{
			from: 'background.html',
			context: 'source',
		},
		{
			from: 'onboarding.html',
			context: 'source',
		},
	];

	const dev = (argv.mode === 'development');

	const downgradeToMv2 = (manifest) => {
		manifest.manifest_version = 2;
		manifest.background = {
			page: 'background.html',
		}
		manifest.browser_action = manifest.action;
		manifest.content_security_policy = "script-src 'self'; object-src 'self'";
		manifest.permissions.push(
			'<all_urls>',
		);
		manifest.web_accessible_resources = manifest.web_accessible_resources[0].resources;
		delete manifest.action;
		delete manifest.host_permissions;
	};

	const adaptToFirefox = (manifest) => {
		manifest.browser_specific_settings = {
			gecko: {
				id: 'vpn@proton.ch',
				strict_min_version: '109.0',
			},
		};
		manifest.optional_permissions = [
			'proxy'
		];
		manifest.content_scripts = [
			{
				all_frames: true,
				js: ['js/transmit.js'],
				matches: [
					'https://account.protonvpn.com/*',
					baseDomainURL + '/*',
					...(dev ? [
						'http://localhost:8080/*',
						'https://account.proton.black/*',
					] : []),
				],
				run_at: 'document_start',
			},
		];
		manifest.background = {
			scripts: ['js/browser-polyfill.min.js', 'js/background.js'],
		};
		manifest.permissions = manifest.permissions.filter(
			permission => permission !== 'webRequestAuthProvider'
				&& permission !== 'proxy',
		);
		manifest.permissions.push(
			'activeTab',
			'webRequestBlocking',
		);
		delete manifest.key;
		delete manifest.externally_connectable;
	};

	const adaptToChromium = (manifest) => {
		const matches = (manifest.externally_connectable || {}).matches || [];

		if (matches.length && matches.indexOf(baseDomainURL + '/*') === -1) {
			manifest.externally_connectable.matches.push(baseDomainURL + '/*');
		}
	};

	const manifestTransformations = [
		options.gecko
			? adaptToFirefox
			: adaptToChromium,
	];

	if (options.mv === 2) {
		manifestTransformations.push(downgradeToMv2);
	}

	if (manifestTransformations.length) {
		copy.unshift({
			from: 'manifest.json',
			context: 'source',
			transform: (content) => {
				const manifest = JSON.parse(content);

				manifestTransformations.forEach(transformation => {
					transformation(manifest);
				});

				return JSON.stringify(manifest, null, '\t');
			},
		});
	}

	const plugins = [
		new CopyWebpackPlugin({
			patterns: copy,
		}),
		new MiniCssExtractPlugin({
			filename: '[name].css',
			chunkFilename: '[id].css',
		}),
	];

	const minimizers = [
		new TerserPlugin({
			terserOptions: {
				mangle: !dev,
				compress: !dev,
				output: {
					beautify: dev,
					indent_level: dev ? 2 : undefined,
				},
			},
		}),
	];

	if (!dev) {
		plugins.unshift(new CleanWebpackPlugin());
		minimizers.push(new CssMinimizerPlugin());
	}

	const config = {
		target: ['web', 'es5'],
		stats: 'errors-only',
		entry: {
			service: './source/js/service.ts',
			background: './source/js/background.ts',
			onboarding: './source/js/onboarding.ts',
			popup: './source/js/popup.ts',
			transmit: './source/js/transmit.ts',
			['css/popup']: './source/css/popup.scss',
			['css/onboarding']: './source/css/onboarding.scss',
		},
		resolve: {
			extensions: ['.tsx', '.ts', '.jsx', '.js'],
			modules: [
				path.resolve(__dirname, 'source'),
				'node_modules',
			],
		},
		output: {
			path: path.join(__dirname, options.distribution || 'distribution'),
			filename: 'js/[name].js',
		},
		plugins: plugins,
		optimization: {
			minimize: true,
			minimizer: minimizers,
		},
		module: {
			rules: [
				{
					test: /\.(js|jsx|ts|tsx)$/,
					enforce: 'pre',
					loader: path.resolve(__dirname, 'webpack-directive-loader.js'),
					exclude: /node_modules/,
				},
				{
					test: /\.(js|jsx|ts|tsx)$/,
					loader: 'ts-loader',
					exclude: /node_modules/,
				},
				{
					test: /\.js$/,
					loader: 'babel-loader',
					exclude: /node_modules/,
				},
				{
					test: /\.s[ac]ss$/i,
					use: [
						MiniCssExtractPlugin.loader,
						'css-loader',
						'sass-loader',
					],
				},
			],
		},
	};

	if (dev) {
		config.devtool = 'source-map';
	}

	return config;
}
