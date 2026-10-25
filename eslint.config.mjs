import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
	{
		ignores: [
			'node_modules',
			'distribution',
			'distribution-*',
			'coverage',
			'**/*.d.ts',
		],
	},
	...tseslint.configs.recommended,
	prettierRecommended,
	{
		rules: {
			// Used on purpose across the codebase (browser APIs, messaging payloads)
			'@typescript-eslint/no-explicit-any': 'off',
			// Rules the codebase already relies on (see its eslint-disable comments)
			'@typescript-eslint/no-use-before-define': 'error',
			'no-async-promise-executor': 'error',
			'prefer-spread': 'error',
		},
	},
	{
		// Node scripts and build configs are CommonJS
		files: ['**/*.js', 'source/js/translation/**'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-use-before-define': ['error', {functions: false}],
		},
	},
);
