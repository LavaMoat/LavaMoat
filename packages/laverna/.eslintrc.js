/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  rules: {
    'no-restricted-globals': [
      'error',
      {
        name: 'console',
        message: 'Use console from capabilities object',
      },
    ],
    'no-restricted-properties': [
      'error',
      {
        object: 'JSON',
        property: 'parse',
        message: 'Use parseJson from capabilities object',
      },
    ],
  },
  // this file is essentially vendored
  ignorePatterns: 'test/types.d.ts',
}
