// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  extends: '../../.config/eslintrc.typed-workspace',
  overrides: [
    {
      files: ['./test/runScenarios.spec.mjs'],
      parserOptions: {
        ecmaVersion: 2022,
      },
    },
    {
      files: ['./{src,test}/**/*.{mjs,js,ts}'],
      globals: {
        Compartment: 'readonly',
        templateRequire: 'readonly',
        lockdown: 'readonly',
      },
    },
    {
      files: ['./src/*Template.js'],
      globals: {
        __lavamoatDebugOptions__: 'readonly',
        __lavamoatSecurityOptions__: 'readonly',
        self: 'readonly',
        __createKernelCore__: 'readonly',
      },
    },
    {
      files: ['./lib/*.js'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: ['test/**/*.{js,mjs}'],
      rules: {
        'n/no-missing-require': 'off',
      },
    },
  ],
  ignorePatterns: ['/test/scenarios/**/*', '/lib/*.umd.js'],
}
