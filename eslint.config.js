import js from '@eslint/js';
export default [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    ignores: ['distribution/**','distribution-ff/**','node_modules/**','dist/**','build/**'],
  },
];
