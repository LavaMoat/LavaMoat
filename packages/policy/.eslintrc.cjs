module.exports = {
  extends: ['../../.config/eslintrc.typed-workspace'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  overrides: [
    {
      files: ['test/**/*.spec.ts'],
      rules: {
        // incompatible with node:test
        '@typescript-eslint/no-floating-promises': 'off',
      },
    },
  ],
  ignorePatterns: ['src/**/*.js', '**/**.d.ts'],
}
