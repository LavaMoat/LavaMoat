// @ts-check

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    'plugin:@endo/recommended',
    '../../.config/eslintrc.typed-workspace',
  ],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2021,
  },
  env: {
    browser: false,
    es6: false,
    node: true,
  },
  rules: {
    // agoric-specific rules
    '@endo/no-nullish-coalescing': 'off',
    '@endo/no-optional-chaining': 'off',
  },
  overrides: [
    {
      files: ['./test/*.js'],
      rules: {
        'no-console': 'error',
        // of dubious value
        'ava/use-t-well': 'off',
      },
    },
  ],
  ignorePatterns: ['./test/fixture/**/*'],
}
