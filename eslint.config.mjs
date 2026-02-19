// @ts-check

/**
 * @summary The root ESLint flat configuration for the LavaMoat monorepo.
 * @see {@link https://eslint.org/docs/latest/use/configure/configuration-files}
 * @see {@link https://typescript-eslint.io/getting-started}
 */

import { readFileSync } from 'node:fs'

import eslintJs from '@eslint/js'
import prettierConfig from 'eslint-config-prettier/flat'
import avaPlugin from 'eslint-plugin-ava'
import * as jsoncPlugin from 'eslint-plugin-jsonc'
import nodePlugin from 'eslint-plugin-n'
import nodeImportPlugin from 'eslint-plugin-node-import'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import semver from 'semver'
import tseslint from 'typescript-eslint'

/**
 * @import {Linter} from 'eslint'
 */

const rootPkg = JSON.parse(
  readFileSync(new URL('package.json', import.meta.url), 'utf8')
)

/**
 * The minimum supported version of Node.js, derived from the `engines.node`
 * field of the root `package.json`.
 *
 * Used by `eslint-plugin-n` to determine which Node.js APIs are available.
 */
const MIN_NODE_VERSION = /** @type {string} */ (
  semver.minVersion(rootPkg.engines.node)?.version ?? '20.19.0'
)

/**
 * Rules applied to `.ts` files in typed packages.
 *
 * @type {Linter.RulesRecord}
 */
const typedTsRules = {
  '@typescript-eslint/consistent-type-exports': [
    'error',
    { fixMixedExportsWithInlineTypeSpecifier: true },
  ],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    {
      disallowTypeAnnotations: true,
      fixStyle: 'inline-type-imports',
      prefer: 'type-imports',
    },
  ],
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
}

/**
 * Rules applied to `.js` files in typed packages.
 *
 * @type {Linter.RulesRecord}
 */
const typedJsRules = {
  '@typescript-eslint/no-require-imports': 'off',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
}

/**
 * Generate typed linting config entries for a single package.
 *
 * Each call produces configs for both `.ts` (type-checked) and `.js`
 * (recommended) files under `packages/<pkg>/{src,test}/`.
 *
 * @param {string} pkg - Package directory name under `packages/`.
 * @returns {Linter.Config[]}
 */
const typedPackageConfigs = (pkg) => {
  const tsFiles = [`packages/${pkg}/{src,test}/**/*.ts`]
  const jsFiles = [`packages/${pkg}/{src,test}/**/*.js`]

  return [
    ...tseslint.configs.recommendedTypeChecked.map((config) => ({
      ...config,
      files: tsFiles,
    })),
    {
      files: tsFiles,
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
      rules: typedTsRules,
    },
    ...tseslint.configs.recommended.map((config) => ({
      ...config,
      files: jsFiles,
    })),
    {
      files: jsFiles,
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
      rules: typedJsRules,
    },
  ]
}

export default defineConfig(
  // ---------------------------------------------------------------------------
  // 1. Global ignores
  //    A config with only `ignores` (no `files`) is treated as global ignores.
  // ---------------------------------------------------------------------------
  {
    ignores: [
      '.yarn/**',
      '**/node_modules/**',
      '**/vendor/**',
      '**/*.d.ts',
      'docs/**',
      'packages/*/examples/**',
      'packages/*/test/**/fixtures/**',
      'packages/*/test/**/fixture/**',
      'packages/*/test/projects/**',
      'packages/*/types/**',
      'packages/*/dist/**',
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. Base config
  //    eslint:recommended, plugin:n/recommended
  // ---------------------------------------------------------------------------
  eslintJs.configs.recommended,
  nodePlugin.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        ...globals.node,
        ...globals.es2023,
      },
    },
    plugins: {
      'node-import': nodeImportPlugin,
    },
    settings: {
      node: {
        /** @see {@link https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-missing-import.md} */
        allowModules: ['deep-equal'],

        /**
         * `eslint-plugin-n` reads the `engines` field of the closest
         * `package.json`, but test fixtures may not have one. Safest to just
         * set it globally.
         */
        version: MIN_NODE_VERSION,
      },
    },
    rules: {
      // base rules; none of these are in eslint/recommended
      'no-empty': ['error', { allowEmptyCatch: true }],

      // allow unused vars prefixed with _
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // new in eslint 10 eslint:recommended; downgrade to warn until
      // pre-existing violations are cleaned up
      'preserve-caught-error': 'warn',
      'no-useless-assignment': 'warn',

      // this is a security toolkit that intentionally shadows globalThis
      'no-shadow-restricted-names': ['error', { reportGlobalThis: false }],

      // additional errors not in n/recommended
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

      // broken in a monorepo
      'n/no-unpublished-require': 'off',

      // we should probably actually fix these and turn them back on
      'n/no-sync': 'off',
      'n/no-process-exit': 'off',

      // require node: prefix for builtin modules
      'node-import/prefer-node-protocol': 'error',
    },
  },

  // ---------------------------------------------------------------------------
  // 3. Test file overrides
  //    Test file overrides (eslint-plugin-ava + browser globals).
  // ---------------------------------------------------------------------------
  {
    files: ['**/test/**/*.{js,ts}'],
    plugins: {
      ava: avaPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      .../** @type {any} */ (avaPlugin.configs.recommended)[0].rules,

      // this should be removed and the issues fixed
      'n/no-path-concat': 'warn',

      // broken in monorepos that resolve dev deps from the workspace root
      'n/no-extraneous-import': 'off',
      'n/no-extraneous-require': 'off',
      'n/no-missing-require': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // 3b. ESM file overrides
  //     .mjs files must be parsed as modules. Yes, this is asinine.
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
    },
  },

  // ---------------------------------------------------------------------------
  // 4. TypeScript file overrides
  //    All .ts files need the TypeScript parser; typed packages get additional
  //    type-aware rules in section 5.
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // eslint-plugin-n does not understand typescript imports
      'n/no-missing-import': 'off',
      // eslint doesn't understand typescript
      'no-unused-vars': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // 5. Typed linting (per-package)
  //    Each package gets type-checked rules for .ts and recommended rules
  //    for .js, both with projectService enabled.
  // ---------------------------------------------------------------------------
  ...typedPackageConfigs('aa'),
  ...typedPackageConfigs('allow-scripts'),
  ...typedPackageConfigs('core'),
  ...typedPackageConfigs('node'),
  ...typedPackageConfigs('react-native-lockdown'),
  ...typedPackageConfigs('vog'),

  // ---------------------------------------------------------------------------
  // 6. Package-specific overrides
  // ---------------------------------------------------------------------------

  // --- packages/browserify ---
  {
    files: ['packages/browserify/test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // --- packages/core ---
  {
    ignores: ['packages/core/lib/*.umd.js', 'packages/core/test/scenarios/**'],
  },
  {
    files: ['packages/core/{src,test}/**/*.{js,ts}'],
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

  // --- packages/lavapack ---
  {
    ignores: [
      'packages/lavapack/bundle.js',
      'packages/lavapack/src/runtime-cjs.js',
      'packages/lavapack/src/runtime.js',
    ],
  },
  {
    files: ['packages/lavapack/src/*-template.js'],
    languageOptions: {
      globals: {
        templateRequire: 'readonly',
        self: 'readonly',
        __reportStatsHook__: 'readonly',
        __createKernel__: 'readonly',
      },
    },
  },

  // --- packages/laverna ---
  {
    files: ['packages/laverna/src/**/*.js'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'console',
          message: 'Use console from capabilities object',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'JSON',
          property: 'parse',
          message: 'Use parseJson from capabilities object',
        },
      ],
    },
  },

  // --- packages/node ---
  { ignores: ['packages/node/src/types.js'] },
  {
    files: ['packages/node/{src,test}/**/*.{js,ts}'],
    languageOptions: {
      sourceType: 'module',
    },
    rules: {
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      'no-console': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ['packages/node/test/**/*.{js,ts}'],
    rules: {
      'no-console': 'error',
      'ava/use-t-well': 'off',
      'n/no-unpublished-import': 'off',
    },
  },
  {
    files: ['packages/node/**/*.ts'],
    rules: {
      'n/no-unpublished-import': 'off',
    },
  },

  // --- packages/react-native-lockdown ---
  {
    files: ['packages/react-native-lockdown/test/**/*.js'],
    rules: {
      'no-console': 'error',
      'ava/use-t-well': 'off',
    },
  },

  // --- packages/yarn-plugin-allow-scripts ---
  { ignores: ['packages/yarn-plugin-allow-scripts/bundles/**'] },

  // --- packages/vog ---
  { ignores: ['packages/vog/src/**/*.js', 'packages/vog/src/**/*.map'] },
  {
    files: ['packages/vog/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // 7. JSON/JSONC files
  //    The jsonc flat/prettier config is an array; we spread it and scope each
  //    entry to only the files we care about.
  // ---------------------------------------------------------------------------
  .../** @type {any} */ (jsoncPlugin).configs['flat/prettier'].map(
    (/** @type {any} */ config) => ({
      ...config,
      files: ['**/tsconfig*.json', '**/*.json5', '**/*.jsonc'],
    })
  ),

  // ---------------------------------------------------------------------------
  // 8. Prettier (must be last to override conflicting rules)
  // ---------------------------------------------------------------------------
  prettierConfig
)
