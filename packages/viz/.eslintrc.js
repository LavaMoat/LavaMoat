/* eslint-disable import/unambiguous */
module.exports = {
  env: {
    browser: true,
    es2020: true,
    commonjs: true,
    mocha: true
  },
  extends: [
    '@metamask/eslint-config',
    'plugin:react/recommended'
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 11,
    sourceType: 'module'
  },
  plugins: [
    'react'
  ],
  rules: {
    'no-negated-condition': 0,
    'import/extensions': ['error', 'always', { ignorePackages: true }],
    'import/no-unassigned-import': 0,
    'import/unambiguous': 0,
    'react/prop-types': 0
  },
}
