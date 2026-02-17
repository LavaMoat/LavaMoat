// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  overrides: [
    {
      files: ['src/**/*.js'],
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
      env: { es2023: true },
      parserOptions: {
        ecmaVersion: 2023,
      },
    },
  ],
  // this file is essentially vendored
  ignorePatterns: 'test/types.d.ts',
}
