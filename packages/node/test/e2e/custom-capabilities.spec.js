import '../../src/preamble.js'

import test from 'ava'
import { fixtureFinder } from '../test-util.js'
import { runCLI } from './cli-util.js'

const fixture = fixtureFinder(import.meta.url)

test('custom capabilities (ESM)', async (t) => {
  const { dir: cwd } = fixture('capabilities')
  const result = await runCLI(
    ['run', '--policy', './lavamoat/esm/policy.json', 'app.js'],
    t,
    { cwd }
  )
  t.is(
    result.stdout,
    `console-a
[cap] console-b
app
`
  )
})

test('custom capabilities (CJS)', async (t) => {
  const { dir: cwd } = fixture('capabilities')
  const result = await runCLI(
    ['run', '--policy', './lavamoat/cjs/policy.json', 'app.js'],
    t,
    { cwd }
  )
  t.is(
    result.stdout,
    `console-a
[cap] console-b
app
`
  )
})
