import 'ses'

import { makeReadPowers } from '@endo/compartment-mapper/node-powers.js'
import test from 'ava'
import url from 'node:url'
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

