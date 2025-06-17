// @ts-check
import eslint from '@eslint/js'
import avaPlugin from 'eslint-plugin-ava'
import jsoncPlugin from 'eslint-plugin-jsonc'
import nodePlugin from 'eslint-plugin-n'
import unicornPlugin from 'eslint-plugin-unicorn'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  {
    plugins: {
      unicorn: unicornPlugin,
    },
    rules: {
      'unicorn/prefer-node-protocol': 'error',
    },
    languageOptions: {
      ecmaVersion: 2021,
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.json5', '**/*.jsonc'],
    extends: [jsoncPlugin.configs['flat/prettier']],
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.{cjs,js}'],
    extends: [
      tseslint.configs.recommended,
      nodePlugin.configs['flat/recommended-script'],
    ],
    // https://github.com/eslint-community/eslint-plugin-n/issues/209
    rules: {
      'n/no-extraneous-import': 'off',
      'n/no-extraneous-require': 'off',

      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.{mjs,mts}', './packages/node/**/*.js'],
    extends: [nodePlugin.configs['flat/recommended-module']],
    // https://github.com/eslint-community/eslint-plugin-n/issues/209
    rules: {
      'n/no-extraneous-import': 'off',
      'n/no-extraneous-require': 'off',
    },
  },
  {
    files: ['**/test/**/*.spec.{cjs,js,mjs,ts,mts,cts}'],
    extends: [avaPlugin.configs['flat/recommended']],
  },
  {
    files: ['**/test/**.spec.{cjs,js}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['./packages/browserify/test/**/*.js'],
    rules: {
      'n/no-missing-require': 'off',
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['packages/perf/**'],
    languageOptions: {
      globals: {
        lockdown: 'readonly',
        Compartment: 'readonly',
      },
    },
  },
  {
    files: ['packages/core/**'],
    languageOptions: {
      globals: {
        Compartment: 'readonly',
        templateRequire: 'readonly',
        lockdown: 'readonly',
      },
    },
  },
  {
    files: ['packages/core/src/*Template.js'],
    languageOptions: {
      globals: {
        __lavamoatDebugOptions__: 'readonly',
        __lavamoatSecurityOptions__: 'readonly',
        self: 'readonly',
        __createKernelCore__: 'readonly',
      },
    },
  },
  {
    files: ['packages/core/lib/*.js'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['packages/core/test/**/*.js'],
    rules: {
      'n/no-missing-require': 'off',
    },
  },
  {
    files: ['packages/node/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
    },
  },
  {
    ignores: [
      '**/types/**/*',
      '**/test/**/fixture*/**/*',
      '**/examples/**/*',
      '.yarn/**/*',
      '**/node_modules/**/*',
      'docs/**/*',
      'packages/*/dist/**/*',
      'packages/*/examples/**/*',
      'packages/*/test/**/fixtures/**/*',
      'packages/*/test/**/fixture/**/*',
      'packages/*/test/projects/**/*',
      'packages/core/lib/*.umd.js',
      'packages/core/test/scenarios/**/*',
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
  }
)
