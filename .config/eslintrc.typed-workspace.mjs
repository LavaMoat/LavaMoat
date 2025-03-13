// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * Contains configuration for workspaces which contain well-typed JavaScript
 * sources.
 *
 * Workspaces which are _fully_ typed (have `checkJs: true` enabled) with
 * _strict mode enabled_ should extend
 * `plugin:@typescript-eslint/recommended-type-checked` instead (via override).
 *
 * @packageDocumentation
 * @see {@link https://typescript-eslint.io/linting/typed-linting}
 */

export default tseslint.config({
  files: [`./{src,test}/**/*.ts`],
  extends: [
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
  ],
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
  },
})
