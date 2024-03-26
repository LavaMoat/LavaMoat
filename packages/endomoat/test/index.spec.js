import 'ses'

import test from 'ava'
import { generatePolicy, run } from '../src/index.js'
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

test.failing('dynamic imports - run a pure-JS app', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('./fixture/json/dynamic.json', import.meta.url)
  )
  const entryFile = '/index.js'

  // TODO remove when `auto` works
  const policy = await generatePolicy(entryFile, {
    readPowers,
  })

  // This should print a warning about dynamic imports, but it should also throw a TypeError
  // because of the dynamic imports
  const result = await run(entryFile, policy, { readPowers })
  t.deepEqual({ .../** @type {object} */ (result) }, { hello: 'hello world' })
})

test.failing('dynamic imports - run a native module', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('./fixture/json/native.json', import.meta.url)
  )

  const entryFile = '/index.js'
  // TODO remove when `auto` works
  const policy = await generatePolicy(entryFile, { readPowers })
  // TODO: the runtime prints no warnings for `node-gyp-build`, which _conditionally_ contains a dynamic require. It should throw a TypeError
  const result = await run(entryFile, policy, { readPowers })
  t.deepEqual({ .../** @type {object} */ (result) }, { hello: 'hello world' })
})
