import 'ses'

import test from 'ava'
import { run } from '../src/index.js'

test('basic operation - run an app without dependencies', async (t) => {
  const entryFile = new URL('./fixture/no-deps/app.js', import.meta.url)
  const policy = {
    resources: {},
  }
  const result = await run(entryFile, policy)
  // this is needed because `result` has a `Symbol.toStringTag` prop which confuses AVA
  t.deepEqual({ .../** @type {object} */ (result) }, { hello: 'world' })
})
