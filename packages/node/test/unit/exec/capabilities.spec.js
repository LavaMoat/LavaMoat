/**
 * Unit tests for the `loadCapabilitySources` and `readCapabilitySources`
 * functions in the `exec/capabilities` module.
 *
 * Note that some of these tests contain `data:` URLs within the contents of a
 * Policy object. While this would never happen in a real-world scenario, it
 * _does_ absolve us from having to write a bunch of teensy-tiny fixture files
 * for the purposes of these tests.
 *
 * @packageDocumentation
 */

import test from 'ava'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  loadCapabilitySources,
  readCapabilitySources,
} from '../../../src/exec/capabilities.js'
import { ErrorCodes } from '../../../src/error-code.js'

const fixtureDir = new URL('../../e2e/fixture/capabilities/', import.meta.url)
const fixtureDirPath = fileURLToPath(fixtureDir)
const policyPath = new URL('./lavamoat/esm/policy.json', fixtureDir)

test('loadCapabilitySources - returns an empty array when `policy.use` is missing', async (t) => {
  const sources = await loadCapabilitySources(
    { resources: {} },
    '/path/to/policy.json'
  )
  t.deepEqual(sources, [])
})

test('loadCapabilitySources - returns an empty array when `policy.use` is empty', async (t) => {
  const sources = await loadCapabilitySources(
    { use: [], resources: {} },
    '/path/to/policy.json'
  )
  t.deepEqual(sources, [])
})

test('loadCapabilitySources - loads a Capability Module via dynamic import and returns the referenced Capability File source', async (t) => {
  const sources = await loadCapabilitySources(
    { use: ['./capabilities.js'], resources: {} },
    policyPath
  )
  t.is(sources.length, 1)
  t.regex(sources[0], /defineCapability\(['"]prefix-log['"]/)
})

test('loadCapabilitySources - fails if policyPath is a directory', async (t) => {
  await t.throwsAsync(
    loadCapabilitySources(
      { use: ['./capabilities.js'], resources: {} },
      new URL('./lavamoat/esm', fixtureDir)
    ),
    {
      message: /Failed to load Capability Module/,
      code: ErrorCodes.ExecutionFailure,
    }
  )
})

test('loadCapabilitySources - throws a helpful error when a Capability Module cannot be loaded', async (t) => {
  await t.throwsAsync(
    loadCapabilitySources(
      { use: ['./does-not-exist.js'], resources: {} },
      policyPath
    ),
    {
      message: /Failed to load Capability Module.+does-not-exist/,
      code: ErrorCodes.ExecutionFailure,
    }
  )
})

test('loadCapabilitySources - throws when a Capability Module does not default-export an array', async (t) => {
  const modURL = new URL(
    'data:text/javascript,export default { not: "an array" }'
  )
  await t.throwsAsync(
    loadCapabilitySources({ use: [modURL.href], resources: {} }, policyPath),
    {
      message: /must have a default export of an array/,
      code: ErrorCodes.ExecutionFailure,
    }
  )
})

test('loadCapabilitySources - throws when a Capability Module entry is missing `names` or `file`', async (t) => {
  const modURL = new URL(
    'data:text/javascript,export default [{ names: ["x"] }]'
  )
  await t.throwsAsync(
    loadCapabilitySources({ use: [modURL.href], resources: {} }, policyPath),
    {
      message: /entries must be of the shape/,
      code: ErrorCodes.ExecutionFailure,
    }
  )
})

test('loadCapabilitySources - throws when a referenced Capability File cannot be read', async (t) => {
  const missingFile = path.join(fixtureDirPath, 'does-not-exist.cap.js')
  const modURL = new URL(
    `data:text/javascript,export default [{ names: ["x"], file: ${JSON.stringify(missingFile)} }]`
  )
  await t.throwsAsync(
    loadCapabilitySources({ use: [modURL.href], resources: {} }, policyPath),
    {
      message: /Failed to read Capability File/,
      code: ErrorCodes.ExecutionFailure,
    }
  )
})

test('loadCapabilitySources - deduplicates files referenced by multiple manifest entries', async (t) => {
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

test('loadCapabilitySources - dedupes a file referenced by multiple Capability Modules', async (t) => {
  const capFile = path.join(
    fixtureDirPath,
    'lavamoat',
    'esm',
    'prefix-log.cap.js'
  )
  const modA = `data:text/javascript,export default [{ names: ["a"], file: ${JSON.stringify(capFile)} }]`
  const modB = `data:text/javascript,export default [{ names: ["b"], file: ${JSON.stringify(capFile)} }]`
  const sources = await loadCapabilitySources(
    { use: [modA, modB], resources: {} },
    policyPath
  )
  t.is(sources.length, 1)
})

test('readCapabilitySources - resolves relative `file` paths against `policyPath`', async (t) => {
  const sources = await readCapabilitySources(
    [{ names: ['prefix-log'], file: './prefix-log.cap.js' }],
    policyPath
  )
  t.is(sources.length, 1)
  t.regex(sources[0], /defineCapability\(['"]prefix-log['"]/)
})

test('readCapabilitySources - accepts a string `policyPath`', async (t) => {
  const sources = await readCapabilitySources(
    [{ names: ['prefix-log'], file: './prefix-log.cap.js' }],
    path.join(fixtureDirPath, 'lavamoat', 'esm', 'policy.json')
  )
  t.is(sources.length, 1)
})

test('readCapabilitySources - keeps absolute `file` paths as-is', async (t) => {
  const capFile = path.join(
    fixtureDirPath,
    'lavamoat',
    'esm',
    'prefix-log.cap.js'
  )
  const sources = await readCapabilitySources(
    [{ names: ['prefix-log'], file: capFile }],
    // a policyPath that would break relative resolution if it were used
    '/nowhere/policy.json'
  )
  t.is(sources.length, 1)
})

test('readCapabilitySources - flattens nested arrays and dedupes files', async (t) => {
  const capFile = path.join(
    fixtureDirPath,
    'lavamoat',
    'esm',
    'prefix-log.cap.js'
  )
  const sources = await readCapabilitySources(
    [
      [{ names: ['a'], file: capFile }],
      [
        { names: ['b'], file: capFile },
        { names: ['c'], file: './prefix-log.cap.js' },
      ],
    ],
    policyPath
  )
  t.is(sources.length, 1)
})

test('readCapabilitySources - returns an empty array for empty input', async (t) => {
  t.deepEqual(await readCapabilitySources([], policyPath), [])
  t.deepEqual(await readCapabilitySources([[], []], policyPath), [])
})

test('readCapabilitySources - throws on a relative `file` with a non-file `policyPath`', async (t) => {
  await t.throwsAsync(
    readCapabilitySources(
      [{ names: ['x'], file: './prefix-log.cap.js' }],
      new URL('data:text/javascript,')
    ),
    {
      message: /paths must be absolute/,
      code: ErrorCodes.ExecutionFailure,
    }
  )
})

test('readCapabilitySources - throws on malformed entries', async (t) => {
  await t.throwsAsync(
    // @ts-expect-error intentionally malformed
    readCapabilitySources([{ names: ['x'] }], policyPath),
    {
      message: /entries must be of the shape/,
      code: ErrorCodes.ExecutionFailure,
    }
  )
})

test('readCapabilitySources - throws when a Capability File cannot be read', async (t) => {
  await t.throwsAsync(
    readCapabilitySources(
      [
        {
          names: ['x'],
          file: path.join(fixtureDirPath, 'does-not-exist.cap.js'),
        },
      ],
      policyPath
    ),
    {
      message: /Failed to read Capability File/,
      code: ErrorCodes.ExecutionFailure,
    }
  )
})
