// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    settings: { react: { version: 'detect' } },
  },
  { files: ['**/*.{ts,tsx}'], ...react.configs.flat['jsx-runtime'] },
  { files: ['**/*.{ts,tsx}'], ...reactHooks.configs.flat.recommended },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react/prop-types': 'off',
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    // Inline mock components in tests are anonymous by design.
    files: ['**/__tests__/**', '**/*.{test,spec}.{ts,tsx}'],
    rules: { 'react/display-name': 'off' },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
];
