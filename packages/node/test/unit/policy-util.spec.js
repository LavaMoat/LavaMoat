import '../../src/preamble.js'

import test from 'ava'
import { fs, vol } from 'memfs'
import * as constants from '../../src/constants.js'
import { ErrorCodes } from '../../src/error-code.js'
import nodePath from 'node:path'
import {
  assertPolicy,
  isMergedWrapper,
  isPolicy,
  isTrusted,
  makeDefaultPolicyOverridePath,
  makeDefaultPolicyPath,
  maybeReadPolicyOverride,
  readPolicy,
  unwrapMerged,
  wrapMerged,
  writePolicy,
} from '../../src/policy-util.js'

/**
 * @import {LavaMoatPolicy} from "@lavamoat/types"
 */

const EMPTY_POLICY = /** @type {LavaMoatPolicy} */ ({ resources: {} })

test.beforeEach(() => {
  vol.reset()
})

test('readPolicy - reads and validates policy from disk', async (t) => {
  vol.fromJSON({
    '/policy.json': JSON.stringify({ resources: {} }),
  })
  const policy = await readPolicy('/policy.json', {
    readFile: /** @type {any} */ (fs.promises.readFile),
  })
  t.deepEqual(policy, { resources: {} })
})

test('readPolicy - reads and validates policy from disk (default path)', async (t) => {
  vol.fromJSON({
    [constants.DEFAULT_POLICY_PATH]: JSON.stringify({ resources: {} }),
  })
  const policy = await readPolicy(constants.DEFAULT_POLICY_PATH, {
    readFile: /** @type {any} */ (fs.promises.readFile),
  })
  t.deepEqual(policy, { resources: {} })
})

test('readPolicyOverride - reads and validates policy override from disk', async (t) => {
  vol.fromJSON({
    '/policy-override.json': JSON.stringify({ resources: {} }),
  })
  const policyOverride = await maybeReadPolicyOverride(
    '/policy-override.json',
    {
      readFile: /** @type {any} */ (fs.promises.readFile),
    }
  )
  t.deepEqual(policyOverride, { resources: {} })
})

test('readPolicyOverride - reads and validates policy override from disk (default path)', async (t) => {
  vol.fromJSON({
    [constants.DEFAULT_POLICY_OVERRIDE_PATH]: JSON.stringify({ resources: {} }),
  })
  const policyOverride = await maybeReadPolicyOverride(
    constants.DEFAULT_POLICY_OVERRIDE_PATH,
    {
      readFile: /** @type {any} */ (fs.promises.readFile),
    }
  )
  t.deepEqual(policyOverride, { resources: {} })
})

test('isPolicy - returns true for valid policy', (t) => {
  t.true(isPolicy({ resources: {} }))
})

test('isPolicy - returns false for invalid policy', (t) => {
  t.false(isPolicy({}))
})

test('assertPolicy - does not throw for valid policy', (t) => {
  t.notThrows(() => assertPolicy({ resources: {} }))
})

test('assertPolicy - throws for invalid policy', (t) => {
  t.throws(() => assertPolicy({}), {
    code: ErrorCodes.InvalidPolicy,
  })
})

test('writePolicy - writes policy to disk', async (t) => {
  await writePolicy('/policy.json', { resources: {} }, { fs })
  const policy = JSON.parse(
    /** @type {string} */ (vol.readFileSync('/policy.json', 'utf8'))
  )
  t.deepEqual(policy, { resources: {} })
})

test('isTrusted - returns true for implicitly trusted policy', (t) => {
  t.true(isTrusted({ resources: {} }))
})

test('isTrusted - returns true for empty root policy', (t) => {
  t.true(isTrusted({ root: {}, resources: {} }))
})

test('isTrusted - returns false for root policy w/ usePolicy', (t) => {
  t.false(isTrusted({ root: { usePolicy: 'foo' }, resources: {} }))
})

test('makeDefaultPolicyPath - returns default policy path for project root', (t) => {
  const result = makeDefaultPolicyPath('/my/project')
  t.is(result, nodePath.join('/my/project', 'lavamoat/node', 'policy.json'))
})

test('makeDefaultPolicyOverridePath - derives override path from policyPath', (t) => {
  const result = makeDefaultPolicyOverridePath({
    policyPath: '/my/project/lavamoat/node/policy.json',
  })
  t.is(
    result,
    nodePath.join('/my/project/lavamoat/node', 'policy-override.json')
  )
})

test('makeDefaultPolicyOverridePath - derives override path from projectRoot', (t) => {
  const result = makeDefaultPolicyOverridePath({ projectRoot: '/my/project' })
  t.is(
    result,
    nodePath.join('/my/project', 'lavamoat/node', 'policy-override.json')
  )
})

test('writePolicy - throws WritePolicyError when directory creation fails', async (t) => {
  const cause = new Error('EPERM: operation not permitted')
  const mockFs = /** @type {any} */ ({
    promises: {
      mkdir: async () => {
        throw cause
      },
      writeFile: async () => {},
      rm: async () => {},
    },
  })
  const err = await t.throwsAsync(
    () => writePolicy('/nope/policy.json', { resources: {} }, { fs: mockFs }),
    { code: ErrorCodes.WritePolicyFailure }
  )
  t.is(/** @type {Error} */ (err).cause, cause)
})

test('writePolicy - removes created directory when file write fails', async (t) => {
  t.plan(3)
  const cause = new Error('EACCES: permission denied')
  /** @type {{ path: string; opts: { recursive: boolean } } | undefined} */
  let rmCall
  const mockFs = /** @type {any} */ ({
    promises: {
      mkdir: async () => '/nope',
      writeFile: async () => {
        throw cause
      },
      rm: async (/** @type {string} */ path, /** @type {any} */ opts) => {
        rmCall = { path, opts }
      },
    },
  })
  const err = await t.throwsAsync(
    () => writePolicy('/nope/policy.json', { resources: {} }, { fs: mockFs }),
    { code: ErrorCodes.WritePolicyFailure }
  )
  t.is(/** @type {Error} */ (err).cause, cause)
  t.deepEqual(rmCall, { path: '/nope', opts: { recursive: true } })
})

test('wrapMerged - wraps a policy in a Merged container', (t) => {
  const wrapped = wrapMerged(EMPTY_POLICY)
  t.is(wrapped.policy, EMPTY_POLICY)
  t.true(wrapped.merged)
})

test('wrapMerged - result is frozen', (t) => {
  const wrapped = wrapMerged(EMPTY_POLICY)
  t.true(Object.isFrozen(wrapped))
})

test('unwrapMerged - extracts the policy from a Merged container', (t) => {
  const wrapped = wrapMerged(EMPTY_POLICY)
  t.is(unwrapMerged(wrapped), EMPTY_POLICY)
})

test('isMergedWrapper - returns true for a Merged wrapper', (t) => {
  t.true(isMergedWrapper(wrapMerged(EMPTY_POLICY)))
})

test('isMergedWrapper - returns false for a plain policy', (t) => {
  t.false(isMergedWrapper(EMPTY_POLICY))
})

test('isMergedWrapper - returns false for null', (t) => {
  t.false(isMergedWrapper(null))
})

test('isMergedWrapper - returns false for { merged: true } without a policy', (t) => {
  t.false(isMergedWrapper({ merged: true }))
})

test('isMergedWrapper - returns false for { policy: {}, merged: false }', (t) => {
  t.false(isMergedWrapper({ policy: EMPTY_POLICY, merged: false }))
})

test('wrapMerged / unwrapMerged round-trip is lossless', (t) => {
  const policy = { ...EMPTY_POLICY, extra: 'data' }
  t.is(unwrapMerged(wrapMerged(policy)), policy)
})
