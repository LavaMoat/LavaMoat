import '../../src/preamble.js'
// eslint-disable-next-line ava/use-test
import anyTest from 'ava'
import { DEFAULT_POLICY_FILENAME } from '../../src/constants.js'
import { isPolicy, readPolicy } from '../../src/policy-util.js'
import { keysOr } from '../../src/util.js'
import { fixtureFinder } from '../test-util.js'
import { createCLIMacros } from './cli-macros.js'
import { makeTempdir, runCLI } from './cli-util.js'

/**
 * @import {TestFn} from 'ava'
 * @import {Tempdir} from './cli-util.js'
 */

const fixture = fixtureFinder(import.meta.url)

const bin = fixture('bin', { entrypoint: 'lard-o-matic' })
const basic = fixture('basic')
const deptree = fixture('deptree')
const dev = fixture('dev')

/**
 * @typedef E2EGenerateTestContext
 * @property {Tempdir} tempdir
 */

const test = /** @type {TestFn<E2EGenerateTestContext>} */ (anyTest)

const { testCLI } = createCLIMacros(test)

test.beforeEach('create tempdir', async (t) => {
  t.context.tempdir = await makeTempdir(t)
})

test.afterEach('cleanup tempdir', async (t) => {
  await t.context.tempdir[Symbol.asyncDispose]()
})

test('"generate --help" prints help', testCLI, ['generate', '--help'])

test('basic policy generation', async (t) => {
  t.plan(2)

  const policyPath = t.context.tempdir.join(`basic-${DEFAULT_POLICY_FILENAME}`)

  const { code } = await runCLI(
    ['generate', basic.entrypoint, '--policy', policyPath],
    t,
    { cwd: basic.dir }
  )
  t.is(code, undefined)
  t.snapshot(await readPolicy(policyPath))
})

test('extensionless bin script handling', async (t) => {
  t.plan(2)

  const policyPath = t.context.tempdir.join(
    `extensionless-${DEFAULT_POLICY_FILENAME}`
  )
  const { code } = await runCLI(
    ['generate', '--bin', '--policy', policyPath, bin.entrypoint],
    t,
    {
      cwd: bin.dir,
    }
  )
  t.is(code, undefined)
  t.snapshot(await readPolicy(policyPath))
})

test('canonical names are used in policy', async (t) => {
  t.plan(2)

  const policyPath = t.context.tempdir.join(
    `canonical-${DEFAULT_POLICY_FILENAME}`
  )

  await runCLI(['generate', deptree.entrypoint, '--policy', policyPath], t, {
    cwd: deptree.dir,
  })

  const policy = await readPolicy(policyPath)

  t.true(
    keysOr(policy.resources).includes('another-pkg>shared-pkg'),
    `policy.resources should include "another-pkg>shared-pkg": ${JSON.stringify(policy.resources)}`
  )
  t.snapshot(policy)
})

test('--quiet is quiet', async (t) => {
  const policyPath = t.context.tempdir.join(`quiet-${DEFAULT_POLICY_FILENAME}`)

  const { code, stdout, stderr } = await runCLI(
    ['generate', basic.entrypoint, '--policy', policyPath, '--quiet'],
    t,
    {
      cwd: basic.dir,
    }
  )
  t.deepEqual(
    { code, stdout, stderr },
    { code: undefined, stdout: '', stderr: '' }
  )
})

test('overrides merged back into policy', async (t) => {
  const policyPath = t.context.tempdir.join(
    `override-merge-${DEFAULT_POLICY_FILENAME}`
  )

  await runCLI(
    [
      'generate',
      deptree.entrypoint,
      '--policy',
      policyPath,
      '--policy-override',
      deptree.policyOverridePath,
    ],
    t,
    { cwd: deptree.dir }
  )

  const policy = await readPolicy(policyPath)

  t.like(policy, {
    resources: {
      'another-pkg': {
        globals: {
          'console.error': true,
          'console.log': true,
        },
      },
    },
  })
})

test('--no-write outputs to STDOUT (and does not write)', async (t) => {
  t.plan(3)

  const policyPath = t.context.tempdir.join(
    `override-merge-no-write-${DEFAULT_POLICY_FILENAME}`
  )

  const { stdout } = await runCLI(
    [
      'generate',
      deptree.entrypoint,
      '--policy',
      policyPath,
      '--policy-override',
      deptree.policyOverridePath,
      '--no-write',
    ],
    t,
    { cwd: deptree.dir }
  )

  // policy path will be unused
  await t.throwsAsync(readPolicy(policyPath), {
    message: /LavaMoat policy file not found at .+/,
  })

  const policy = JSON.parse(stdout)
  // but the policy is written to stdout
  t.true(isPolicy(policy))

  t.like(policy, {
    resources: {
      'another-pkg': {
        globals: {
          'console.error': true,
          'console.log': true,
        },
      },
    },
  })
})

test('--dev processes dev deps', async (t) => {
  t.plan(2)

  const policyPath = t.context.tempdir.join(`dev-${DEFAULT_POLICY_FILENAME}`)

  const { code } = await runCLI(
    [
      'generate',
      dev.entrypoint,
      '--policy',
      policyPath,
      '--dev',
      '--policy-override',
      dev.policyOverridePath,
    ],
    t,
    { cwd: dev.dir }
  )
  t.is(code, undefined)
  const policy = await readPolicy(policyPath)
  t.snapshot(policy)
})
