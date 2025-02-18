import '../../src/preamble.js'

import test from 'ava'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_POLICY_FILENAME } from '../../src/constants.js'
import { isPolicy, readPolicy } from '../../src/policy-util.js'
import { createCLIMacros } from './cli-macros.js'
import { runCLI } from './cli-util.js'

/**
 * Path to the "extensionless" fixture dir
 */
const EXTENSIONLESS_FIXTURE_DIR = fileURLToPath(
  new URL('./fixture/extensionless/', import.meta.url)
)

/**
 * Path to the "bin-entry" fixture dir
 */
const BIN_ENTRY_FIXTURE_DIR = fileURLToPath(
  new URL('./fixture/bin-entry/', import.meta.url)
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

const { testCLI } = createCLIMacros(test)

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
      { t, cwd: BASIC_FIXTURE_DIR }
    )
    t.is(code, undefined)
    const policy = await readPolicy(policyPath)
    t.true(isPolicy(policy))
  } finally {
    await rm(tempdir, { recursive: true, force: true })
  }
})

test('bin script handling (extensionless)', async (t) => {
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
      {
        cwd: EXTENSIONLESS_FIXTURE_DIR,
        t,
      }
    )
    t.is(code, undefined)

    const policy = await readPolicy(policyPath)
    t.true(isPolicy(policy))
  } finally {
    await rm(tempdir, { recursive: true, force: true })
  }
})

test('bin script handling', async (t) => {
  t.plan(3)

  const tempdir = await mkdtemp(
    path.join(tmpdir(), t.title.replace(/\s+/g, '-'))
  )
  try {
    const policyPath = path.join(
      tempdir,
      `bin-entry-${DEFAULT_POLICY_FILENAME}`
    )
    const { code } = await runCLI(
      ['generate', '--bin', '--policy', policyPath, BIN_ENTRY],
      {
        cwd: BIN_ENTRY_FIXTURE_DIR,
        t,
      }
    )
    t.is(code, undefined)

    const policy = await readPolicy(policyPath)
    t.true(isPolicy(policy))

    t.snapshot(policy)
  } finally {
    await rm(tempdir, { recursive: true, force: true })
  }
})
