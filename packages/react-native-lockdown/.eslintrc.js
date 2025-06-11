// TODO: use types when we determine what types to use
module.exports = {
  extends: ['../../.config/eslintrc.typed-workspace'],
  parserOptions: {
    sourceType: 'script',
    ecmaVersion: 2020,
  },
  env: {
    browser: false,
    es6: false,
    node: true,
  },
  overrides: [
    {
      files: ['./test/**/*.js'],
      rules: {
        // use t.log()
        'no-console': 'error',

        // of dubious value
        'ava/use-t-well': 'off',
      },
    },
  ],
  ignorePatterns: ['./types/*', '**/*.tsbuildinfo'],
}
