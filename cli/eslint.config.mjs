import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import tsParser from '@typescript-eslint/parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  {
    ignores: [
      '**/bin',
      '**/node_modules',
      '**/scripts',
      'jest.config.ts',
      'src/lib/website/sc/deweb-sc-bytecode.ts',
    ],
  },
  ...compat.extends('@massalabs', 'prettier'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      'tsdoc/syntax': 'warn',
      'max-len': ['error', 200],
      camelcase: 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': 'off',
      'comma-dangle': 'off',
    },
  },
]
