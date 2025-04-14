import '../../../src/preamble.js'

import test from 'ava'
import stringify from 'json-stable-stringify'
import { DEFAULT_POLICY_PATH } from '../../../src/constants.js'
import { readJsonFile } from '../../../src/fs.js'
import {
  ENDO_POLICY_BOILERPLATE,
  ENDO_POLICY_ENTRY_TRUSTED,
  toEndoPolicy,
} from '../../../src/policy-converter.js'
import { hrPath } from '../../../src/util.js'

/**
 * @import {Policy} from '@endo/compartment-mapper'
 * @import {LavaMoatEndoPackagePolicyItem} from '../../../src/types.js'
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 */

const KS_POLICY_URL = new URL(
  './conversion-fixture/kitchen-sink/policy.json',
  import.meta.url
)
const KS_POLICY_OVERRIDES_URL = new URL(
  './conversion-fixture/kitchen-sink/policy-overrides.json',
  import.meta.url
)

// this file is JSON but is in the incorrect format
const INVALID_POLICY_URL = new URL(
  './conversion-fixture/invalid.json',
  import.meta.url
)

const EMPTY_POLICY_URL = new URL(
  './conversion-fixture/empty.json',
  import.meta.url
)

const ENDO_POLICY_TRUSTED = /** @type {const} */ ({
  ...ENDO_POLICY_BOILERPLATE,
  entry: { ...ENDO_POLICY_ENTRY_TRUSTED },
})

/** @satisfies {LavaMoatPolicy} */
const DEFAULT_POLICY = Object.freeze({ resources: {} })

/**
 * Round-trips an object through JSON to strip `undefined` and unserializable
 * values
 *
 * Primitive values of `obj` aren't allowed—despite being stringifiable—due to
 * the questionable typing of `json-stable-stringify`.
 *
 * @template {object} T Some object
 * @param {T} obj - Some object
 * @returns {T}
 */
const compactJSON = (obj) => JSON.parse(`${stringify(obj)}`)

test('toEndoPolicy() - no overrides', async (t) => {
  const policy = await toEndoPolicy(KS_POLICY_URL)
  const actual = compactJSON(policy)

  const expected = /** @type {Policy<LavaMoatEndoPackagePolicyItem>} */ (
    await readJsonFile(
      new URL(
        './conversion-fixture/kitchen-sink/endo-policy.json',
        import.meta.url
      )
    )
  )

  t.deepEqual(actual, expected)
})

test('toEndoPolicy() - no policy', async (t) => {
  const lmPolicy = undefined

  // @ts-expect-error invalid type
  await t.throwsAsync(toEndoPolicy(lmPolicy), {
    message: `LavaMoat policy file not found at ${hrPath(DEFAULT_POLICY_PATH)}`,
  })
})

test('toEndoPolicy() - empty policy', async (t) => {
  const actual = await toEndoPolicy(DEFAULT_POLICY)
  t.deepEqual(actual, ENDO_POLICY_TRUSTED)
})

test('toEndoPolicy() - policy path as URL', async (t) => {
  const lmPolicyUrl = new URL(
    './conversion-fixture/empty.json',
    import.meta.url
  )

  const actual = await toEndoPolicy(lmPolicyUrl)
  t.deepEqual(actual, ENDO_POLICY_TRUSTED)
})

test('toEndoPolicy() - policy path as string', async (t) => {
  const actual = await toEndoPolicy(EMPTY_POLICY_URL)
  t.deepEqual(actual, ENDO_POLICY_TRUSTED)
})

test('toEndoPolicy() - invalid policy', async (t) => {
  // @ts-expect-error invalid type
  await t.throwsAsync(toEndoPolicy([1, 2, 3]), {
    message: 'Invalid LavaMoat policy; does not match expected schema',
  })
})

test('toEndoPolicy() - invalid policy (by path)', async (t) => {
  await t.throwsAsync(toEndoPolicy(INVALID_POLICY_URL), {
    message: `Invalid LavaMoat policy at ${hrPath(INVALID_POLICY_URL)}; does not match expected schema`,
  })
})

test('toEndoPolicy() - invalid policy override', async (t) => {
  const lmPolicyOverride = [1, 2, 3]

  await t.throwsAsync(
    // @ts-expect-error invalid type
    toEndoPolicy(DEFAULT_POLICY, {
      policyOverride: lmPolicyOverride,
    }),
    {
      message:
        'Invalid LavaMoat policy overrides; does not match expected schema',
    }
  )
})

test('toEndoPolicy() - invalid policy override (by path)', async (t) => {
  await t.throwsAsync(
    toEndoPolicy(DEFAULT_POLICY, {
      policyOverridePath: INVALID_POLICY_URL,
    }),
    {
      message: `Invalid LavaMoat policy overrides at ${hrPath(INVALID_POLICY_URL)}; does not match expected schema`,
    }
  )
})

test('toEndoPolicy() - override merging', async (t) => {
  const policy = await toEndoPolicy(KS_POLICY_URL, {
    policyOverridePath: KS_POLICY_OVERRIDES_URL,
  })
  const actual = compactJSON(policy)

  const expected = /** @type {Policy<LavaMoatEndoPackagePolicyItem>} */ (
    await readJsonFile(
      new URL(
        './conversion-fixture/kitchen-sink/endo-policy-overrides.json',
        import.meta.url
      )
    )
  )

  t.deepEqual(actual, expected)
})
