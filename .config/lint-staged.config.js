// @ts-check

/** @type {import('lint-staged').Config} */
module.exports = {
  '!(**/fixture/**/node_modules/**/)*.js': ['eslint --fix', 'prettier --write'],
  '!(**/fixture/**/node_modules/**/)*.(ts|md|ya?ml|json)': ['prettier --write'],
  '!((!(**/fixture/**/node_modules/**/)|(package-lock|policy)*)).json': [
    'prettier --write',
  ],
}
