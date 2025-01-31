import '../../src/preamble.js'

// eslint-disable-next-line ava/use-test
import anyTest from 'ava'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_POLICY_FILENAME } from '../../src/constants.js'
import { isPolicy, readPolicy } from '../../src/policy-util.js'
import { keysOr } from '../../src/util.js'
import { createCLIMacros } from './cli-macros.js'
import { runCLI } from './cli-util.js'

/**
 * @import {TestFn} from 'ava'
 */

/**
 * @typedef CLITestContext
 * @property {string} tempdir
 */

const test = /** @type {TestFn<CLITestContext>} */ (anyTest)

/**
 * Path to the "extensionless" fixture dir
 */
const EXTENSIONLESS_FIXTURE_DIR = fileURLToPath(
  new URL('./fixture/extensionless/', import.meta.url)
)

const BASIC_FIXTURE_DIR = fileURLToPath(
  new URL('./fixture/basic/', import.meta.url)
)

/**
 * Path to the "basic" fixture entry point
 */
const BASIC_FIXTURE_ENTRYPOINT = fileURLToPath(
  new URL('./fixture/basic/app.js', import.meta.url)
)

/**
 * Name of the executable to use as the entrypoint within the "extensionless"
 * fixture
 */
const BIN_ENTRY = 'lard-o-matic'

/**
 * Path to `deptree` fixture entry point
 */
const DEP_FIXTURE_ENTRYPOINT = fileURLToPath(
  new URL('./fixture/deptree/app.js', import.meta.url)
)

/**
 * The `deptree` fixture's directory
 */
const DEP_FIXTURE_ENTRYPOINT_DIR = path.dirname(DEP_FIXTURE_ENTRYPOINT)

const { testCLI } = createCLIMacros(test)

test.beforeEach('setup temp dir', async (t) => {
  t.context.tempdir = await mkdtemp(
    path.join(tmpdir(), 'lavamoat-node-cli-test-')
  )
})

test.afterEach('cleanup temp dir', async (t) => {
  await rm(t.context.tempdir, { recursive: true, force: true })
})

test('"generate --help" prints help', testCLI, ['generate', '--help'])

test('basic policy generation', async (t) => {
  t.plan(2)

  const tempdir = await mkdtemp(
    path.join(tmpdir(), t.title.replace(/\s+/g, '-'))
  )
  try {
    const policyPath = path.join(tempdir, `basic-${DEFAULT_POLICY_FILENAME}`)

    const { code } = await runCLI(
      ['generate', BASIC_FIXTURE_ENTRYPOINT, '--policy', policyPath],
      t,
      { cwd: BASIC_FIXTURE_DIR }
    )
    t.is(code, undefined)
    const policy = await readPolicy(policyPath)
    t.true(isPolicy(policy))
  } finally {
    await rm(tempdir, { recursive: true, force: true })
  }
})

test('extensionless bin script handling', async (t) => {
  t.plan(2)

  const tempdir = await mkdtemp(
    path.join(tmpdir(), t.title.replace(/\s+/g, '-'))
  )

  try {
    const policyPath = path.join(
      tempdir,
      `extensionless-${DEFAULT_POLICY_FILENAME}`
    )
    const { code } = await runCLI(
      ['generate', '--bin', '--policy', policyPath, BIN_ENTRY],
      t,
      {
        cwd: EXTENSIONLESS_FIXTURE_DIR,
      }
    )
    t.is(code, undefined)

    const policy = await readPolicy(policyPath)
    t.true(isPolicy(policy))
  } finally {
    await rm(tempdir, { recursive: true, force: true })
  }
})

test('generate - policy generation - canonical names', async (t) => {
  t.plan(3)

  const policyPath = path.join(
    t.context.tempdir,
    `canonical-${DEFAULT_POLICY_FILENAME}`
  )

  await runCLI(
    ['generate', DEP_FIXTURE_ENTRYPOINT, '--policy', policyPath],
    t,
    { cwd: DEP_FIXTURE_ENTRYPOINT_DIR }
  )

  const policy = await readPolicy(policyPath)
  t.true(isPolicy(policy))

  t.true(
    keysOr(policy.resources).includes('another-pkg>shared-pkg'),
    'policy.resources should include "another-pkg>shared-pkg": ' +
      policy.resources
  )
  t.snapshot(policy)
})

test('--quiet is quiet', async (t) => {
  const tempdir = await mkdtemp(
    path.join(tmpdir(), t.title.replace(/\s+/g, '-'))
  )

  try {
    const policyPath = path.join(tempdir, `quiet-${DEFAULT_POLICY_FILENAME}`)

    const { code, stdout, stderr } = await runCLI(
      ['generate', BASIC_FIXTURE_ENTRYPOINT, '--policy', policyPath, '--quiet'],
      t,
      {
        cwd: BASIC_FIXTURE_DIR,
      }
    )
    t.deepEqual(
      { code, stdout, stderr },
      { code: undefined, stdout: '', stderr: '' }
    )
  } finally {
    await rm(tempdir, { recursive: true, force: true })
  }
})
