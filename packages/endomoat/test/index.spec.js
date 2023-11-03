import test from 'ava'
import { run } from '../src/index.js'

import path from 'path'

test('run a file', async (t) => {
  const entryFile = new URL('./fixtures/main/app.js', import.meta.url).href
  const policy = {
    resources: {},
  }
  const result = await run(entryFile, policy)
  t.deepEqual(result, {
    hello: 'world',
  })
})
