import 'ses'

import test from 'ava'
import { run } from '../src/index.js'

/**
 * @import {LavaMoatPolicy} from 'lavamoat-core';
 */

test('basic operation - run an app without dependencies', async (t) => {
  const entryFile = new URL('./fixture/no-deps/app.js', import.meta.url)
  const policy = {
    resources: {},
  }
  const result = await run(entryFile, policy)
  // this is needed because `result` has a `Symbol.toStringTag` prop which confuses AVA
  t.deepEqual({ .../** @type {object} */ (result) }, { hello: 'world' })
})

test('dynamic imports - run a pure-JS app', async (t) => {
  // this test should use real fixtures because we need to `require()` dependencies
  // outside of an Endo context (via `importNowHook`)
  const entryFile = new URL('./fixture/dynamic/index.js', import.meta.url)

  /** @type {LavaMoatPolicy} */
  const policy = {
    resources: {
      'dynamic-require': {
        packages: {
          dummy: true,
        },
      },
      dummy: {
        packages: {
          muddy: true,
        },
      },
    },
  }

  const result = await run(entryFile, policy)
  t.deepEqual({ .../** @type {object} */ (result) }, { hello: 'hello world' })
})

test('dynamic imports - run a native module', async (t) => {
  // TODO: fix this snapshot
  // const { readPowers } = await loadJSONFixture(
  //   new URL('./fixture/json/native.json', import.meta.url)
  // )

  const entryFile = new URL('./fixture/native/index.js', import.meta.url)

  /** @type {LavaMoatPolicy} */
  const policy = {
    resources: {
      hello_world: {
        packages: {
          'node-gyp-build': true,
        },
        globals: {
          __dirname: true,
        },
        native: true,
      },
      'hello_world>node-gyp-build': {
        globals: {
          __webpack_require__: true,
          __non_webpack_require__: true,
          process: true,
        },
        builtin: {
          'fs.existsSync': true,
          'fs.readdirSync': true,
          'os.arch': true,
          'os.platform': true,
          'path.dirname': true,
          'path.join': true,
          'path.resolve': true,
        },
      },
    },
  }

  const result = await run(entryFile, policy)
  t.deepEqual({ .../** @type {object} */ (result) }, { hello: 'world' })
})

test('static import - run a native module', async (t) => {
  const entryFile = new URL('./fixture/static-native/index.js', import.meta.url)

  /** @type {LavaMoatPolicy} */
  const policy = {
    resources: {
      hello_world: {
        native: true,
        packages: {
          node_gyp_build: true,
        },
      },
    },
  }

  const result = await run(entryFile, policy)
  t.deepEqual({ .../** @type {object} */ (result) }, { hello: 'world' })
})
