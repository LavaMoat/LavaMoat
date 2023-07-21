module.exports = {
  root: true,
  // this is the same as an .eslintignore file
  ignorePatterns: [
    '.yarn/**/*',
    '**/*.umd.js',
    '**/node_modules/**/*',
    'docs/**/*',
    'packages/*/examples/**/*',
    'packages/*/test/**/fixtures/**/*',
    'packages/*/test/projects/**/*',
    'packages/lavapack/bundle.js',
    'packages/lavapack/src/runtime-cjs.js',
    'packages/lavapack/src/runtime.js',
    'packages/perf/trials/**/*',
    'packages/survey/mitm/**/*',
    'packages/viz/dist/**/*',
    'packages/viz/src/example-policies/**/*',
  ],
  parserOptions: {
    // this should be whatever the latest env version provides. some plugin is
    // messing with this, so we need to set it manually.
    // https://eslint.org/docs/latest/use/configure/language-options#specifying-environments
    ecmaVersion: 12,
  },
  env: { es2020: true }, // this should be synced with the version of V8 used by the min supported node version
  extends: ['@metamask/eslint-config-nodejs'],
  rules: {
    // base rules. should probably use eslint/recommended instead.
    'arrow-spacing': ['error', { before: true, after: true }],
    'brace-style': ['error', '1tbs'],
    'comma-dangle': ['error', 'always-multiline'],
    curly: ['error', 'all'],
    'eol-last': ['error', 'always'],
    indent: ['error', 2, { SwitchCase: 1, ObjectExpression: 'first' }],
    'no-restricted-globals': 0,
    'no-unexpected-multiline': 'error',
    quotes: ['error', 'single'],
    semi: ['error', 'never'],
    'space-before-blocks': ['error', 'always'],
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'ignore',
        named: 'ignore',
        asyncArrow: 'always',
      },
    ],

    // plugin rules

    // all of these override stuff set in @metamask/eslint-config-nodejs.
    'n/no-extraneous-require': 0,
    'n/global-require': 0,
    'n/exports-style': 0,
    'n/no-process-env': 0,
    // this rule seems broken
    'n/no-unpublished-require': 0,
    // we should probably actually fix these three and disable this override.
    'n/no-sync': 0,
    'n/no-process-exit': 0,
    'n/no-path-concat': 0,
  },
  // these are plugin-specific settings.
  settings: {
    // note that this name is "node" while the plugin is named "n".
    // probably for historical reasons, but this may eventually break.
    node: {
      version: '14.17.0', // should be set to minimum node version supported
      allowModules: ['deep-equal'], // something weird about this dependency
    },
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['packages/*/test/**/*.js', 'packages/*/src/**/*.test.js'],
      extends: ['plugin:ava/recommended'],
      rules: {
        'ava/no-import-test-files': 0,
      },
    },
    {
      files: ['packages/core/src/**/*.js'],
      globals: {
        Compartment: 'readonly',
        templateRequire: 'readonly',
        lockdown: 'readonly',
      },
    },
    {
      // for viz package.  most of this copied out of its own eslint config
      files: ['packages/viz/**/*.js'],
      env: {
        browser: true,
        es2020: true,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: 'module',
      },
      extends: ['plugin:react/recommended'],
      plugins: ['react', 'import'],
      rules: {
        'no-negated-condition': 0,
        'import/extensions': ['error', 'always', { ignorePackages: true }],
        'import/no-unassigned-import': 0,
        'import/unambiguous': 0,
        'react/prop-types': 0,
      },
    },
  ],
}
