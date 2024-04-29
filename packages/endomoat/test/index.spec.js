import 'ses'

import test from 'ava'
import { run } from '../src/index.js'
import { loadJSONFixture } from './fixture-util.js'

test('basic operation - run an app without dependencies', async (t) => {
  const entryFile = new URL('./fixture/no-deps/app.js', import.meta.url)
  const policy = {
    resources: {},
  }
  const result = await run(entryFile, policy)
  // this is needed because `result` has a `Symbol.toStringTag` prop which confuses AVA
  t.deepEqual({ .../** @type {object} */ (result) }, { hello: 'world' })
})

test.only('dynamic imports - run a pure-JS app', async (t) => {
  // this test should use real fixtures because we need to `require()` dependencies
  // outside of an Endo context (via `importNowHook`)
  const entryFile = new URL('./fixture/dynamic/index.js', import.meta.url)

  /** @type {import('lavamoat-core').LavaMoatPolicy} */
  const policy = {
    resources: {
      'dynamic-require': {
        packages: {
          dummy: 'dynamic',
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
  t.log(result)
  t.deepEqual({ .../** @type {object} */ (result) }, { hello: 'hello world' })
})

test.failing('dynamic imports - run a native module', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('./fixture/json/native.json', import.meta.url)
  )

  const entryFile = '/index.js'
  // TODO: the runtime prints no warnings for `node-gyp-build`, which _conditionally_ contains a dynamic require. It should throw a TypeError
  const result = await run(entryFile, { readPowers })
  t.deepEqual({ .../** @type {object} */ (result) }, { hello: 'hello world' })
})
