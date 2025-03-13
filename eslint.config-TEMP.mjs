import { fixupConfigRules } from '@eslint/compat'
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import nodeImport from 'eslint-plugin-node-import'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
      '**/types/**/*',
      '**/examples/**/*',
      '.yarn/**/*',
      '**/node_modules/**/*',
      'docs/**/*',
      'packages/*/examples/**/*',
      'packages/*/test/**/fixtures/**/*',
      'packages/*/test/**/fixture/**/*',
      'packages/*/test/projects/**/*',
      'packages/core/lib/*.umd.js',
      'packages/lavapack/bundle.js',
      'packages/lavapack/src/runtime-cjs.js',
      'packages/lavapack/src/runtime.js',
      'packages/perf/trials/**/*',
      'packages/survey/mitm/**/*',
      'packages/viz/dist/**/*',
      'packages/viz/src/example-policies/**/*',
      'packages/yarn-plugin-allow-scripts/bundles',
      'packages/*/types',
      '!.github',
    ],
  },
  ...compat.extends('eslint:recommended', 'plugin:n/recommended', 'prettier'),
  {
    plugins: {
      'node-import': nodeImport,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      ecmaVersion: 2021,
      sourceType: 'commonjs',
    },

    settings: {
      node: {
        allowModules: ['deep-equal'],
        version: '16.20.0',
      },
    },

    rules: {
      'no-empty': [
        'error',
        {
          allowEmptyCatch: true,
        },
      ],

      'n/callback-return': 'error',
      'n/handle-callback-err': 'error',
      'n/no-callback-literal': 'error',
      'n/no-mixed-requires': 'error',
      'n/no-new-require': 'error',
      'n/no-restricted-import': 'error',
      'n/no-restricted-require': 'error',
      'n/prefer-global/buffer': 'error',
      'n/prefer-global/console': 'error',
      'n/prefer-global/process': 'error',
      'n/prefer-global/text-decoder': 'error',
      'n/prefer-global/text-encoder': 'error',
      'n/prefer-global/url-search-params': 'error',
      'n/prefer-global/url': 'error',
      'n/prefer-promises/dns': 'error',
      'n/prefer-promises/fs': 'error',
      'n/no-unpublished-require': 'off',
      'n/no-sync': 'off',
      'n/no-process-exit': 'off',
      'node-import/prefer-node-protocol': 'error',
    },
  },
  ...fixupConfigRules(compat.extends('plugin:ava/recommended')).map(
    (config) => ({
      ...config,
      files: ['**/*/*/test/**/*.js', '**/*/*/test/**/*.ts'],
    })
  ),
  {
    files: ['**/*/*/test/**/*.js', '**/*/*/test/**/*.ts'],

    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },

    rules: {
      'n/no-path-concat': 'warn',
      'n/no-extraneous-import': 'off',
      'n/no-extraneous-require': 'off',
    },
  },
  {
    files: ['**/*.ts'],

    languageOptions: {
      parser: tsParser,
    },

    rules: {
      'n/no-missing-import': 'off',
      'no-unused-vars': 'off',
    },
  },
  ...compat.extends('plugin:jsonc/prettier').map((config) => ({
    ...config,
    files: ['**/tsconfig*.json', '**/*.json5', '**/*.jsonc'],
  })),
]
