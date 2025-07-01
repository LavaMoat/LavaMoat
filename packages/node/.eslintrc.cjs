// TODO: use types when we determine what types to use
module.exports = {
  env: {
    browser: false,
    es6: false,
    node: true,
  },
  extends: [
    'plugin:@endo/recommended',
    '../../.config/eslintrc.typed-workspace',
    'plugin:perfectionist/recommended-natural-legacy',
  ],
  ignorePatterns: ['**/test/**/fixture/**/*', 'src/types.js'],
  overrides: [
    {
      files: ['./test/**/*.js', './test/**/*.ts'],
      rules: {
        // of dubious value
        'ava/use-t-well': 'off',

        // this plugin has trouble finding memfs
        'n/no-unpublished-import': 'off',

        // use t.log()
        'no-console': 'error',
      },
    },
    {
      files: '*.ts',
      rules: {
        'n/no-unpublished-import': 'off',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@stylistic'],
  rules: {
    // agoric-specific rules
    '@endo/no-nullish-coalescing': 'off',
    '@endo/no-optional-chaining': 'off',

    '@stylistic/lines-around-comment': [
      'warn',
      {
        allowArrayStart: true,
        allowBlockStart: true,
        allowClassStart: true,
        allowInterfaceStart: true,
        // these conflict with prettier, so we must allow them
        allowObjectStart: true,
        allowTypeStart: true,
        beforeBlockComment: true,
      },
    ],

    '@stylistic/lines-between-class-members': 'error',

    '@stylistic/padding-line-between-statements': [
      'error',
      { blankLine: 'always', next: 'export', prev: '*' },
    ],

    '@stylistic/quotes': [
      'error',
      'single',
      { allowTemplateLiterals: 'avoidEscape', avoidEscape: true },
    ],
    '@stylistic/semi': ['error', 'never'],

    // TODO: this needs to be changed to `@typescript-eslint/no-restricted-types` once tseslint is upgraded to v8+
    // unfortunately, this does not apply to js files
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          LavamoatModuleRecordOptions: {
            fixWith: 'SimpleLavamoatModuleRecordOptions',
            message: 'Use SimpleLavamoatModuleRecordOptions instead',
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
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
      },
    ],

    // all of the functions in this module are declarations, so might as well enforce some consistency.
    // this does not prevent a declaration from using the 'function' keyword, though
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],

    'no-console': 'error',

    'perfectionist/sort-named-exports': [
      'error',
      { groupKind: 'values-first' },
    ],
  },
}
