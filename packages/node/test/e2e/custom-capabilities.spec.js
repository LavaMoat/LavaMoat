import '../../src/preamble.js'

import test from 'ava'
import { fixtureFinder } from '../test-util.js'
import { runCLI } from './cli-util.js'

const fixture = fixtureFinder(import.meta.url)

test('custom capabilities', async (t) => {
  const result = await runCLI(['run', '--policy', 'policy.json', 'app.js'], {
    cwd: fixture('capabilities').dir,
  })
  t.is(
    result.stdout,
    `console-a
[cap] console-b
app
`
  )
})
