import 'ses'

import test from 'ava'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_POLICY_FILENAME } from '../src/constants.js'
import { isPolicy, readPolicy } from '../src/policy.js'
import { readJsonFile } from '../src/util.js'
import { runCli } from './fixture-util.js'
import { createMacros } from './macros.js'

/**
 * @import {PackageJson} from 'type-fest'
 */

const { testCLI } = createMacros(test)

/**
 * Path to the "basic" fixture entry point
 */
const BASIC_ENTRYPOINT = fileURLToPath(
  new URL('./fixture/basic/app.js', import.meta.url)
)

/**
 * The "basic" fixture's directory
 */
const BASIC_ENTRYPOINT_CWD = path.dirname(BASIC_ENTRYPOINT)

test('"--help" prints help', testCLI, ['--help'])

test(
  '"--version" matches package descriptor',
  testCLI,
  ['--version'],
  async (t, { stdout }) => {
    const { version } = /** @type {PackageJson} */ (
      await readJsonFile(new URL('../package.json', import.meta.url))
    )
    t.is(stdout, `${version}`)
  }
)

test('run - "run --help" prints help', testCLI, ['run', '--help'])

test(
  'run - missing entrypoint',
  testCLI,
  ['run'],
  async (t, { code, stderr, stdout }) => {
    t.plan(3)
    t.is(code, 1)
    t.is(stdout, '')
    t.regex(stderr, /Not enough non-option arguments: got 0, need at least 1/)
  }
)

test(
  'run - basic execution',
  testCLI,
  ['run', BASIC_ENTRYPOINT, '--cwd', BASIC_ENTRYPOINT_CWD],
  'hello world'
)

test('generate - "generate --help" prints help', testCLI, [
  'generate',
  '--help',
])

test('generate - basic policy generation', async (t) => {
  const tempdir = await fs.mkdtemp(
    path.join(tmpdir(), 'lavamoat-node-cli-test-')
  )

  const policyPath = path.join(tempdir, DEFAULT_POLICY_FILENAME)

  try {
    await runCli(['generate', BASIC_ENTRYPOINT, '--policy', policyPath])
    const policy = await readPolicy(policyPath)
    t.true(isPolicy(policy))
    // t.deepEqual(policy, { resources: {} })
  } finally {
    await fs.rm(tempdir, { recursive: true, force: true })
  }
})
