import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // vite.config.js gira in Node, dove __dirname è definito
  {
    files: ['vite.config.js'],
    languageOptions: { globals: globals.node },
  },
  // Primitive shadcn/ui e context esportano anche varianti/hook oltre ai
  // componenti: il vincolo del fast-refresh qui non si applica
  {
    files: ['src/components/ui/**', 'src/context/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
