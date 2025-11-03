module.exports = {
  extends: [
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
  overrides: [{
    files: ['./test/**/*.ts'],
    rules:  {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    }
  }]
}
