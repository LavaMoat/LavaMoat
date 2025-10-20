// TODO: use types when we determine what types to use
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

    // all of the functions in this module are declarations, so might as well enforce some consistency.
    // this does not prevent a declaration from using the 'function' keyword, though
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],

    'no-console': 'error',

    // TODO: this needs to be changed to `@typescript-eslint/no-restricted-types` once tseslint is upgraded to v8+
    // unfortunately, this does not apply to js files
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          LavamoatModuleRecordOptions: {
            message: 'Use SimpleLavamoatModuleRecordOptions instead',
            fixWith: 'SimpleLavamoatModuleRecordOptions',
            suggest: ['SimpleLavamoatModuleRecordOptions'],
          },
        },
      },
    ],

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
  overrides: [
    {
      files: ['./test/**/*.js', './test/**/*.ts'],
      rules: {
        // use t.log()
        'no-console': 'error',

        // of dubious value
        'ava/use-t-well': 'off',

        // this plugin has trouble finding memfs
        'n/no-unpublished-import': 'off',
        // this is wonky too
        'n/no-missing-import': 'off'
      },
    },
    {
      files: '*.ts',
      rules: {
        'n/no-unpublished-import': 'off',
      },
    },
  ],
  ignorePatterns: ['**/test/**/fixture/**/*', 'src/types.js'],
}
