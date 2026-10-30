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

test('custom capabilities with relative module paths', async (t) => {
  const { dir: cwd } = fixture('capabilities-relative')
  const result = await runCLI(['run', 'app.js'], t, {
    cwd,
  })
  t.is(result.stdout, 'console-a\n[cap] console-b\napp\n')
})

test('repairs', async (t) => {
  const { dir: cwd } = fixture('repairs')
  const result = await runCLI(['run', 'app.js'], t, {
    cwd,
  }).then(({ stdout }) => JSON.parse(stdout))

  t.deepEqual(result, [
    { name: 'env-a', FROBNICATE: 'frobnicated', ENCABULATE: 'encabulated' },
    { name: 'env-b', ENCABULATE: 'encabulated' },
  ])
})
