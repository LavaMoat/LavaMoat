module.exports = {
  root: true,
  // this is the same as an .eslintignore file
  ignorePatterns: [
    '.yarn/**/*',
    '**/node_modules/**/*',
    'docs/**/*',
    'packages/*/examples/**/*',
    'packages/*/test/**/fixtures/**/*',
    'packages/*/test/projects/**/*',
    'packages/core/lib/*.umd.js',
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
  // this should be synced with the version of V8 used by the min supported node version
  env: { es2020: true, node: true },
  // the prettier config disables all eslint rules known to conflict with prettier
  extends: ['eslint:recommended', 'plugin:n/recommended', 'prettier'],
  rules: {
    // base rules; none of these are in eslint/recommended
    'no-empty': ['error', { allowEmptyCatch: true }],

    // additional errors not in n/recommended
    'n/callback-return': 'error',
    'n/handle-callback-err': 'error',
    'n/no-callback-literal': 'error',
    'n/no-mixed-requires': 'error',
    'n/no-new-require': 'error',
    'n/no-restricted-import': 'error',
    'n/no-restricted-require': 'error',
    'n/prefer-global/buffer': 'error',
    'n/prefer-global/console': 'error',
    'n/prefer-global/process': 'error',
    'n/prefer-global/text-decoder': 'error',
    'n/prefer-global/text-encoder': 'error',
    'n/prefer-global/url-search-params': 'error',
    'n/prefer-global/url': 'error',
    'n/prefer-promises/dns': 'error',
    'n/prefer-promises/fs': 'error',

    // these rules seem broken in a monorepo
    'n/no-extraneous-require': 'off',
    'n/no-unpublished-require': 'off',

    // we should probably actually fix these three and turn these back on
    'n/no-sync': 'off', // very few reasons to actually use this; "CLI tool" is not one of them
    'n/no-process-exit': 'off', // should not be used with async code
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
        'ava/no-import-test-files': 'off',
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
      files: ['packages/*/test/**/*.js'],
      env: {
        browser: true,
      },
      rules: {
        'no-unused-vars': 'off',
        'no-undef': 'off',
        'n/no-path-concat': 'off', // this should be removed and the issues fixed
        'n/no-missing-require': 'off',
      },
    },
    {
      files: ['packages/core/lib/**/*.js'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
    {
      files: ['packages/lavapack/src/*-template.js'],
      globals: {
        templateRequire: 'readonly',
        self: 'readonly',
        __reportStatsHook__: 'readonly',
        __createKernel__: 'readonly',
      },
    },
    {
      files: ['packages/core/src/*Template.js'],
      globals: {
        __lavamoatDebugOptions__: 'readonly',
        __lavamoatSecurityOptions__: 'readonly',
        self: 'readonly',
        __createKernelCore__: 'readonly',
      },
    },
    {
      files: ['packages/perf/**/*.js'],
      globals: {
        lockdown: 'readonly',
        Compartment: 'readonly',
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
        'no-negated-condition': 'off',
        'import/extensions': ['error', 'always', { ignorePackages: true }],
        'import/no-unassigned-import': 'off',
        'import/unambiguous': 'off',
        'react/prop-types': 'off',
        'n/no-missing-import': 'off',
      },
    },
    {
      files: ['packages/viz/src/App.test.js'],
      env: {
        mocha: true,
      },
    },
  ],
}
