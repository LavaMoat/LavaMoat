/**
 * WallabyJS configuration file
 *
 * @packageDocumentation
 * @see {@link https://www.wallabyjs.com/docs}
 */

/**
 * @import {IWallabyConfig} from 'wallabyjs'
 */

/**
 * @type {IWallabyConfig}
 */
module.exports = {
  files: [
    // #region @lavamoat/node files
    // probably needed for ESM & AVA config
    'packages/node/package.json',

    // sources
    'packages/node/src/**/*.js',

    // fixtures, snapshots, harnesses, etc.
    'packages/node/test/unit/**/snapshots/*.md',
    'packages/node/test/unit/json-fixture/**/*.json',
    'packages/node/test/unit/policy/**/*.json',
    {
      pattern: 'packages/node/test/unit/fixture/**/*',
      instrument: false,
    },
    {
      pattern: 'packages/node/test/unit/**/snapshots/*.snap',
      binary: true, // IMPORTANT - or will get snapshot file is corrupted
    },
    'packages/node/test/unit/**/*.js',

    // this should be the inverse of the patterns in `tests` below
    '!packages/node/test/unit/**/*.spec.js',
    '!packages/node/test/unit/**/*-macros.js',
    // #endregion
  ],
  tests: [
    '!**/node_modules/**',

    // #region @lavamoat/node tests
    'packages/node/test/unit/**/*.spec.js',
    // we must treat macros as test files otherwise wallaby will be unable to map tests
    'packages/node/test/unit/**/*-macros.js',
  ],
  // #endregion

  env: {
    type: 'node',
    params: {
      // --experimental-vm-modules required for AVA + ESM
      // --no-warnings needed to suppress stderr, which is evaluated during scenario execution
      runner: '--experimental-vm-modules --no-warnings',
    },
  },
  // required for hoisted dev deps, apparently
  symlinkNodeModules: true,
  testFramework: 'ava',
  workers: {
    restart: true,
  },
  setup(wallaby) {
    // wallaby's instrumentation will break worker threads, and
    // @lavamoat/node's scenario runner uses a worker thread. it uses this
    // path to determine whether or not to run instrumented or original code
    process.env.WALLABY_PROJECT_DIR = wallaby.localProjectDir
  },
  runMode: 'onsave',
}
