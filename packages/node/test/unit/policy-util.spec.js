import '../../src/preamble.js'

import test from 'ava'
import { fs, vol } from 'memfs'
import * as constants from '../../src/constants.js'
import { ErrorCodes } from '../../src/error-code.js'
import {
  assertPolicy,
  isTrusted,
  loadPolicies,
  maybeReadPolicyOverride,
  readPolicy,
  writePolicy,
} from '../../src/policy-util.js'
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

test('loadPolicies - loads and merges policies from disk', async (t) => {
  vol.fromJSON({
    '/policy.json': JSON.stringify({ resources: {} }),
    '/policy-override.json': JSON.stringify({ resources: {} }),
  })
  const policy = await loadPolicies('/policy.json', {
    policyOverridePath: '/policy-override.json',
    readFile: /** @type {any} */ (fs.promises.readFile),
  })
  t.deepEqual(policy, { resources: {} })
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
