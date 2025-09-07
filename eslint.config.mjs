// eslint.config.js — minimal Flat Config (ESLint v9)
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'node_modules/**',
      'distribution/**',
      'distribution-ff/**',
      '**/*.d.ts',
    ],
  },
  // Note: not applying js.configs.recommended globally to avoid
  // base JS rules affecting TS files in this legacy codebase.
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // Loosen common offenders for legacy code
      'no-unused-expressions': 'off',
      'no-async-promise-executor': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'prefer-spread': 'off',
      'prefer-const': 'off',
      'no-empty': 'off',
      'no-prototype-builtins': 'off',
    },
  },
  // TypeScript files — minimal rules to start
  {
    files: ['**/*.{ts,cts,mts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-unused-expressions': 'off',
      'no-async-promise-executor': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'prefer-spread': 'off',
      'prefer-const': 'off',
      'no-empty': 'off',
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-this-alias': 'off',
    },
  },
];
