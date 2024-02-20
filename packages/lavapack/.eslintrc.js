// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  overrides: [
    {
      files: ['./src/*-template.js'],
      globals: {
        templateRequire: 'readonly',
        self: 'readonly',
        __reportStatsHook__: 'readonly',
        __createKernel__: 'readonly',
      },
    },
    {
      files: ['test/**/*.js'],
      rules: {
        'n/no-missing-require': 'off',
      },
    },
  ],
  ignorePatterns: ['/bundle.js', '/src/runtime-cjs.js', '/src/runtime.js'],
}
