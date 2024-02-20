// @ts-check

/**
 * @summary The root ESLint configuration.
 * @description
 *
 * - If a workspace emits declaration files, it should contain a `.eslintrc.js`
 * which extends {@link file://./.config/eslintrc.typed-workspace.js}.
 * - A workspace _only_ needs its own `.eslintrc.js` if it needs to override this configuration.
 * - While you may be tempted, please do not use an `eslintConfig` prop in your
 * `package.json`; use `.eslintrc.js` for consistency.
 * - Note: glob patterns in this file should _not_ be relative.
 *
 * @packageDocumentation
 */

/**
 * The minimum EcmaScript runtime environment to support
 * @see {@link https://eslint.org/docs/latest/use/configure/language-options#specifying-environments}
 */
const ECMASCRIPT_ENV = 'es2021'

/**
 * The minimum EcmaScript language version to support
 * @see {@link https://eslint.org/docs/latest/use/configure/language-options#specifying-parser-options}
 */
const ECMASCRIPT_VERSION = 2021

/**
 * The minimum supported version of Node.js
 *
 * Instead of maintaining this value, we could use the `semver` package to read
 * the root `engines` field and dynamically generate this value using
 * `SemVer.minVersion()`.
 */
const MIN_NODE_VERSION = '16.20.0'

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  parserOptions: {
    // this should be whatever the latest env version provides. some plugin is
    // messing with this, so we need to set it manually.
    // https://eslint.org/docs/latest/use/configure/language-options#specifying-environments
    ecmaVersion: ECMASCRIPT_VERSION,
  },
  // this should be synced with the version of V8 used by the min supported node version
  env: { [ECMASCRIPT_ENV]: true, node: true },
  // the prettier config disables all eslint rules known to conflict with prettier
  extends: ['eslint:recommended', 'plugin:n/recommended', 'prettier'],
  rules: {
    // base rules; none of these are in eslint/recommended
    'no-empty': ['error', { allowEmptyCatch: true }],

    // @typescript-eslint/no-unused-vars is more robust
    'no-unused-vars': 'off',

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

    // these rules seem broken in a monorepo
    'n/no-unpublished-require': 'off',

    // we should probably actually fix these three and turn these back on
    'n/no-sync': 'off', // very few reasons to actually use this; "CLI tool" is not one of them
    'n/no-process-exit': 'off', // should not be used with async code
  },
  settings: {
    node: {
      /**
       * For `n/no-missing-import`
       * @see {@link https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-missing-import.md}
       */
      allowModules: ['deep-equal'], // something weird about this dependency

      /**
       * For `n/no-unsupported-features`.
       *
       * `eslint-plugin-n` looks in the `engines` field of the closest
       * `package.json` to the file being linted to determine this value.  For
       * our workspaces, this field is present, but in some test fixtures it may
       * not be. We _do_ try to ignore test fixtures, but that is easy to
       * accidentally override via `eslint` on the command line.  So, the safest
       * thing is to just set it here.
       */
      version: MIN_NODE_VERSION,
    },
  },
  overrides: [
    {
      files: ['**/*/*/test/**/*.js'],
      extends: ['plugin:ava/recommended'],
      env: {
        browser: true,
      },
      rules: {
        // this should be removed and the issues fixed
        'n/no-path-concat': 'warn',

        // these two are broken in monorepos that resolve dev deps from the workspace root
        'n/no-extraneous-import': 'off',
        'n/no-extraneous-require': 'off',
      },
    },
    {
      files: ['**/*.ts'],
      rules: {
        // eslint-plugin-n does not understand typescript imports
        'n/no-missing-import': 'off',
      },
      parser: '@typescript-eslint/parser',
    },
  ],
  ignorePatterns: [
    '**/types/**/*',
    '**/test/**/fixtures/**/*',
    '**/examples/**/*',
  ],
}
