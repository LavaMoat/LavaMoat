/* eslint-disable import/unambiguous */
module.exports = {
  env: {
    browser: true,
    es2020: true,
    commonjs: true,
    mocha: true
  },
  extends: [
    'plugin:react/recommended',
    '../../.eslintrc.json'
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 11,
    sourceType: 'module'
  },
  plugins: [
    'import',
    'react'
  ],
  rules: {
    'no-negated-condition': 0,
    'import/extensions': ['error', 'always', { ignorePackages: true }],
    'import/no-unassigned-import': 0,
    'import/unambiguous': 0,
    'react/prop-types': 0
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}
