import '../../src/preamble.js'

import test from 'ava'
import { fs, vol } from 'memfs'
import * as constants from '../../src/constants.js'
import { ErrorCodes } from '../../src/error-code.js'
import nodePath from 'node:path'
import {
  assertPolicy,
  isPolicy,
  isTrusted,
  loadPolicies,
  makeDefaultPolicyOverridePath,
  makeDefaultPolicyPath,
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
  t.deepEqual(policy, { resources: {}, [constants.MERGED_POLICY_FIELD]: true })
})

test('isPolicy - returns true for valid policy', (t) => {
  t.true(isPolicy({ resources: {} }))
})

test('isPolicy - returns false for invalid policy', (t) => {
  t.false(isPolicy({}))
})

test('isPolicy - returns false for non-object values', (t) => {
  t.plan(5)
  t.false(isPolicy(null))
  t.false(isPolicy(undefined))
  t.false(isPolicy(42))
  t.false(isPolicy('string'))
  t.false(isPolicy([]))
})

test('isPolicy - returns true when include is absent', (t) => {
  t.true(isPolicy({ resources: { foo: {} } }))
})

test('isPolicy - returns true for policy with string include entries', (t) => {
  t.true(isPolicy({ resources: {}, include: ['my-package'] }))
})

test('isPolicy - returns false for policy with empty string include entry', (t) => {
  t.false(isPolicy({ resources: {}, include: [''] }))
})

test('isPolicy - returns false when include is not an array', (t) => {
  t.false(isPolicy({ resources: {}, include: 'my-package' }))
})

test('isPolicy - returns true for policy with IncludeEntryByName', (t) => {
  t.true(isPolicy({ resources: {}, include: [{ name: 'my-package' }] }))
})

test('isPolicy - returns true for policy with IncludeEntryByName with modules', (t) => {
  t.true(
    isPolicy({
      resources: {},
      include: [{ name: 'my-package', modules: ['./foo.js', 'bar.js'] }],
    })
  )
})

test('isPolicy - returns false for policy with IncludeEntryByName with empty name', (t) => {
  t.false(isPolicy({ resources: {}, include: [{ name: '' }] }))
})

test('isPolicy - returns false for policy with IncludeEntryByName with empty string in modules', (t) => {
  t.false(
    isPolicy({
      resources: {},
      include: [{ name: 'my-package', modules: [''] }],
    })
  )
})

test('isPolicy - returns true for policy with IncludeEntryByLocation', (t) => {
  t.true(isPolicy({ resources: {}, include: [{ location: './local-pkg' }] }))
})

test('isPolicy - returns true for policy with IncludeEntryByLocation with modules', (t) => {
  t.true(
    isPolicy({
      resources: {},
      include: [{ location: './local-pkg', modules: ['./index.js'] }],
    })
  )
})

test('isPolicy - returns false for policy with IncludeEntryByLocation with empty location', (t) => {
  t.false(isPolicy({ resources: {}, include: [{ location: '' }] }))
})

test('isPolicy - returns false for policy with IncludeEntryByLocation with absolute location', (t) => {
  t.false(
    isPolicy({ resources: {}, include: [{ location: '/absolute/path' }] })
  )
})

test('isPolicy - returns false for policy with IncludeEntryByLocation with empty string in modules', (t) => {
  t.false(
    isPolicy({
      resources: {},
      include: [{ location: './local-pkg', modules: [''] }],
    })
  )
})

test('isPolicy - returns false for include item missing both name and location', (t) => {
  t.false(isPolicy({ resources: {}, include: [{ modules: ['foo.js'] }] }))
})

test('isPolicy - returns true for policy with mixed valid include entry types', (t) => {
  t.true(
    isPolicy({
      resources: {},
      include: ['my-package', { name: 'other-pkg' }, { location: './local' }],
    })
  )
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

test('loadPolicies - uses policyPath option as hint for override path when given a policy object', async (t) => {
  const overrideResources = { foo: { packages: { bar: true } } }
  vol.fromJSON({
    '/hint/policy-override.json': JSON.stringify({
      resources: overrideResources,
    }),
  })
  const policy = await loadPolicies(
    { resources: {} },
    {
      policyPath: '/hint/policy.json',
      readFile: /** @type {any} */ (fs.promises.readFile),
    }
  )
  t.deepEqual(policy, {
    resources: overrideResources,
    [constants.MERGED_POLICY_FIELD]: true,
  })
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

// --- assertPolicy / isPolicy backed by @lavamoat/policy schema ---

test('assertPolicy - thrown error includes schema detail in message', (t) => {
  const err = t.throws(() => assertPolicy({}), {
    code: ErrorCodes.InvalidPolicy,
  })
  const msg = /** @type {Error} */ (err).message
  // message must mention the default prefix
  t.regex(msg, /does not match expected schema/i)
  // message must include field name from schema error
  t.regex(msg, /resources/)
})

test('assertPolicy - cause is a ZodError with issues array', (t) => {
  const err = t.throws(() => assertPolicy({}), {
    code: ErrorCodes.InvalidPolicy,
  })
  const cause = /** @type {any} */ (err?.cause)
  t.truthy(cause)
  t.true(Array.isArray(cause.issues))
  t.true(cause.issues.length > 0)
})

test('assertPolicy - custom message appears as prefix in thrown error', (t) => {
  const err = t.throws(() => assertPolicy({}, 'my custom prefix'), {
    code: ErrorCodes.InvalidPolicy,
  })
  t.regex(/** @type {Error} */ (err).message, /my custom prefix/)
})

test('readPolicy - throws InvalidPolicy with path and schema detail for invalid content', async (t) => {
  vol.fromJSON({ '/bad-policy.json': JSON.stringify({ notResources: {} }) })
  const err = await t.throwsAsync(
    () =>
      readPolicy('/bad-policy.json', {
        readFile: /** @type {any} */ (fs.promises.readFile),
      }),
    { code: ErrorCodes.InvalidPolicy }
  )
  const msg = /** @type {Error} */ (err).message
  t.regex(msg, /bad-policy\.json/)
  t.regex(msg, /resources/)
})

test('maybeReadPolicyOverride - throws InvalidPolicy with path and schema detail for invalid content', async (t) => {
  vol.fromJSON({
    '/bad-override.json': JSON.stringify({ notResources: {} }),
  })
  const err = await t.throwsAsync(
    () =>
      maybeReadPolicyOverride('/bad-override.json', {
        readFile: /** @type {any} */ (fs.promises.readFile),
      }),
    { code: ErrorCodes.InvalidPolicy }
  )
  const msg = /** @type {Error} */ (err).message
  t.regex(msg, /bad-override\.json/)
  t.regex(msg, /resources/)
})

test('isPolicy - returns false for non-canonical resource name', (t) => {
  t.false(isPolicy({ resources: { 'Not A Name!': {} } }))
})

test('isPolicy - returns false for non-builtin key under builtin', (t) => {
  t.false(
    isPolicy({ resources: { foo: { builtin: { 'not-a-builtin': true } } } })
  )
})
