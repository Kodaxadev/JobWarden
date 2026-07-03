// Flat ESLint config. Dev-only tooling — nothing here ships. Catches the bug classes that
// have actually bitten this codebase: unused imports, accidental globals (stringly-typed
// record fields), and == drift. Intentionally light; it guards, it doesn't nag.
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    // Not our code: dependencies and the local impeccable/design tooling (gitignored).
    ignores: ['node_modules/**', '.claude/**', '.github/**', '.impeccable/**'],
  },
  js.configs.recommended,
  {
    files: ['js/**/*.js', 'service-worker.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      // Browser + service worker; Buffer for integrity.js's Node-test fallback path.
      globals: { ...globals.browser, ...globals.serviceworker, Buffer: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      eqeqeq: ['warn', 'smart'],
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },
  {
    files: ['tests/**/*.mjs', 'scripts/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
    },
  },
];
