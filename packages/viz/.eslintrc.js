// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: ['plugin:react/recommended'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    es2020: true,
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: 'module',
  },
  plugins: ['react', 'import'],
  rules: {
    'no-negated-condition': 'off',
    'import/extensions': ['error', 'always', { ignorePackages: true }],
    'import/no-unassigned-import': 'off',
    'import/unambiguous': 'off',
    'react/prop-types': 'off',
    'n/no-missing-import': 'off',
  },
  overrides: [
    {
      files: ['./src/App.test.js'],
      env: {
        mocha: true,
      },
    },
  ],
  ignorePatterns: ['/dist', '/src/example-policies'],
}
