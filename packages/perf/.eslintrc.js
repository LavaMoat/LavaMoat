// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  globals: {
    lockdown: 'readonly',
    Compartment: 'readonly',
  },
  ignorePatterns: ['/trials/**/*'],
}
