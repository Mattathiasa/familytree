import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/* Flat config for the whole workspace. Type-aware rules are deliberately left
   to `npm run typecheck`, which already runs tsc across all three packages —
   lint stays fast and mechanical so it can gate every push without duplicating
   the compiler's work. */
export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'coverage/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
    rules: {
      ...reactHooks.configs.flat['recommended-latest'].rules,
      /* The standard data-fetch effect resets its own loading/error flags
         before fetching. React's own docs show this shape, and every screen
         here follows it; the rule would demand a rewrite of all of them for
         no behavioural gain. */
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['apps/**/*.tsx'],
    ...reactRefresh.configs.vite,
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    /* A context file exporting its provider, its hook and its route helper
       together is the standard shape; splitting it would move code for the
       linter's benefit alone. */
    files: ['apps/**/app/store.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
);
