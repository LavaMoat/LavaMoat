// @ts-check

/**
 * Contains configuration for workspaces which contain well-typed JavaScript
 * sources.
 *
 * Workspaces which are _fully_ typed (have `checkJs: true` enabled) with
 * _strict mode enabled_ should extend
 * `plugin:@typescript-eslint/recommended-type-checked` instead (via override).
 *
 * This configuration is dependent upon the convention we use for
 * `tsconfig.json`. Moving a `tsconfig.json` or otherwise monkeying with the
 * `parserOptions.project` settings here will **break stuff** because of how
 * `@typescript-eslint/parser` reads `tsconfig.json` files. Caution is advised!
 *
 * @see {@link https://typescript-eslint.io/linting/typed-linting/monorepos}
 * @packageDocumentation
 */

const path = require('node:path')

/**
 * @satisfies {import('eslint').Linter.Config}
 */
module.exports = {
  overrides: [
    {
      files: './{src,test}/**/*.{js,ts}',
      parser: '@typescript-eslint/parser',
      parserOptions: {
        // this needs to point to the dir containing the root `tsconfig.json`.
        // unsure if this will be resolved relative to _this_ file or the extending
        // config, so let's just use an absolute path!
        tsconfigRootDir: path.join(__dirname, '..'),
        project: true,
      },
      overrides: [
        {
          files: `./{src,test}/**/*.ts`,
          extends: ['plugin:@typescript-eslint/recommended-type-checked'],
        },
        {
          files: `./{src,test}/**/*.js`,
          extends: ['plugin:@typescript-eslint/recommended'],
          rules: {
            // default to CommonJS; override if using ESM
            '@typescript-eslint/no-var-requires': 'off',
          },
        },
      ],
    },
  ],
}
