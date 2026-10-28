import test from 'ava'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCapabilitySources } from '../../../src/exec/capabilities.js'

const fixtureDir = new URL('../../e2e/fixture/capabilities/', import.meta.url)
const fixtureDirPath = fileURLToPath(fixtureDir)
const policyPath = new URL('./lavamoat/esm/policy.json', fixtureDir)

test('returns an empty array when `policy.use` is missing', async (t) => {
  const sources = await loadCapabilitySources(
    { resources: {} },
    '/path/to/policy.json'
  )
  t.deepEqual(sources, [])
})

test('returns an empty array when `policy.use` is empty', async (t) => {
  const sources = await loadCapabilitySources(
    { use: [], resources: {} },
    '/path/to/policy.json'
  )
  t.deepEqual(sources, [])
})

test('loads a Capability Module via dynamic import and returns the referenced Capability File source', async (t) => {
  const sources = await loadCapabilitySources(
    { use: ['./capabilities.js'], resources: {} },
    policyPath
  )
  t.is(sources.length, 1)
  t.regex(sources[0], /defineCapability\(['"]prefix-log['"]/)
})

test('fails if policyPath is a directory', async (t) => {
  await t.throwsAsync(
    loadCapabilitySources(
      { use: ['./capabilities.js'], resources: {} },
      new URL('./lavamoat/esm', fixtureDir)
    ),
    { message: /failed to load Capability Module/ }
  )
})

test('throws a helpful error when a Capability Module cannot be loaded', async (t) => {
  await t.throwsAsync(
    loadCapabilitySources(
      { use: ['./does-not-exist.js'], resources: {} },
      policyPath
    ),
    { message: /failed to load Capability Module '\.\/does-not-exist\.js'/ }
  )
})

test('throws when a Capability Module does not default-export an array', async (t) => {
  const modURL = new URL(
    'data:text/javascript,export default { not: "an array" }'
  )
  await t.throwsAsync(
    loadCapabilitySources({ use: [modURL.href], resources: {} }, policyPath),
    { message: /must have a default export of an array/ }
  )
})

test('throws when a Capability Module entry is missing `names` or `file`', async (t) => {
  const modURL = new URL(
    'data:text/javascript,export default [{ names: ["x"] }]'
  )
  await t.throwsAsync(
    loadCapabilitySources({ use: [modURL.href], resources: {} }, policyPath),
    { message: /entries must be \{ names: string\[\], file: string \}/ }
  )
})

test('throws when a referenced Capability File cannot be read', async (t) => {
  const missingFile = path.join(fixtureDirPath, 'does-not-exist.cap.js')
  const modURL = new URL(
    `data:text/javascript,export default [{ names: ["x"], file: ${JSON.stringify(missingFile)} }]`
  )
  await t.throwsAsync(
    loadCapabilitySources({ use: [modURL.href], resources: {} }, policyPath),
    { message: /failed to read Capability File/ }
  )
})

test('deduplicates files referenced by multiple manifest entries', async (t) => {
  const capFile = path.join(
    fixtureDirPath,
    'lavamoat',
    'esm',
    'prefix-log.cap.js'
  )
  const modURL = new URL(
    `data:text/javascript,export default [{ names: ["a"], file: ${JSON.stringify(capFile)} }, { names: ["b"], file: ${JSON.stringify(capFile)} }]`
  )
  const sources = await loadCapabilitySources(
    { use: [modURL.href], resources: {} },
    policyPath
  )
  t.is(sources.length, 1)
})
