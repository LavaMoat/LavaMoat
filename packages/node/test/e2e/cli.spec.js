/* eslint-disable ava/assertion-arguments */
import '../../src/preamble.js'

// eslint-disable-next-line ava/use-test
import anyTest from 'ava'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_POLICY_FILENAME } from '../../src/constants.js'
import { isPolicy, readPolicy } from '../../src/policy-util.js'
import { readJsonFile } from '../../src/util.js'
import { createCLIMacros } from './cli-macros.js'
import { runCli } from './cli-util.js'

const test = /** @type {TestFn<CLITestContext>} */ (anyTest)

/**
 * @import {TestFn} from 'ava'
 * @import {PackageJson} from 'type-fest'
 */

const { testCLI } = createCLIMacros(test)

/**
 * Path to the "basic" fixture entry point
 */
const BASIC_FIXTURE_ENTRYPOINT = fileURLToPath(
  new URL('./fixture/basic/app.js', import.meta.url)
)

/**
 * The "basic" fixture's directory
 */
const BASIC_FIXTURE_ENTRYPOINT_DIR = path.dirname(BASIC_FIXTURE_ENTRYPOINT)

/**
 * @typedef CLITestContext
 * @property {string} tempdir
 */

test.before('setup temp dir', async (t) => {
  t.context.tempdir = await fs.mkdtemp(
    path.join(tmpdir(), 'lavamoat-node-cli-test-')
  )
})

test.after('cleanup temp dir', async (t) => {
  await fs.rm(t.context.tempdir, { recursive: true, force: true })
})

test('"--help" prints help', testCLI, ['--help'])

test(
  '"--version" matches package descriptor',
  testCLI,
  ['--version'],
  async (t, { stdout }) => {
    const { version } = /** @type {PackageJson} */ (
      await readJsonFile(new URL('../../package.json', import.meta.url))
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
  ['run', BASIC_FIXTURE_ENTRYPOINT, '--root', BASIC_FIXTURE_ENTRYPOINT_DIR],
  'hello world'
)

test(
  'run - execution with extra positionals',
  testCLI,
  [
    'run',
    BASIC_FIXTURE_ENTRYPOINT,
    '--root',
    BASIC_FIXTURE_ENTRYPOINT_DIR,
    'howdy',
  ],
  { code: 1, stderr: /unknown argument/i }
)

test(
  'run - execution with extra non-option arguments (positionals only)',
  testCLI,
  [
    'run',
    BASIC_FIXTURE_ENTRYPOINT,
    '--root',
    BASIC_FIXTURE_ENTRYPOINT_DIR,
    '--',
    'howdy',
  ],
  'howdy world'
)

test(
  'run - execution with extra non-option arguments (positionals and options)',
  testCLI,
  [
    'run',
    BASIC_FIXTURE_ENTRYPOINT,
    '--root',
    BASIC_FIXTURE_ENTRYPOINT_DIR,
    '--',
    'howdy',
    '--yelling',
  ],
  'HOWDY WORLD'
)

test('generate - "generate --help" prints help', testCLI, [
  'generate',
  '--help',
])

test('generate - basic policy generation', async (t) => {
  const policyPath = path.join(t.context.tempdir, DEFAULT_POLICY_FILENAME)

  await runCli(['generate', BASIC_FIXTURE_ENTRYPOINT, '--policy', policyPath])
  const policy = await readPolicy(policyPath)
  t.true(isPolicy(policy))
})
