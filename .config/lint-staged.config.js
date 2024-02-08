// @ts-check

/** @type {import('lint-staged').Config} */
module.exports = {
  '*.js': ['eslint --fix', 'prettier --write'],
  '*.(ts|md|ya?ml|json)': ['prettier --write'],
  '!((package-lock|policy)*).json': ['prettier --write'],
  'packages/*/src/**/*.js|package?(-lock).json': () => [
    'npm run test:prep',
    'npm run test:dirty-check',
  ],
}
