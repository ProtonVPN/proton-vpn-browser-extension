import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,

  // base: ignora diretórios de build e node_modules
  {
    ignores: ['distribution/**','distribution-ff/**','dist/**','build/**','node_modules/**'],
  },

  // Arquivos Node/CommonJS (webpack, scripts, repack, loaders, configs)
  {
    files: [
      'webpack*.js',
      'webpack-*.js',
      'webpack*.config.js',
      'scripts/**/*.js',
      'repack.js',
      'config.js',
      'webpack-directive-loader.js'
    ],
    languageOptions: {
      globals: { ...globals.node, console: 'readonly', module: 'readonly', __dirname: 'readonly', require: 'readonly', process: 'readonly' },
      sourceType: 'commonjs'
    },
    rules: { 'no-undef': 'off' }
  }
];
