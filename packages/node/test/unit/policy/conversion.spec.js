import '../../../src/preamble.js'

import test from 'ava'
import stringify from 'json-stable-stringify'
import { MERGED_POLICY_FIELD } from '../../../src/constants.js'
import { ErrorCodes } from '../../../src/error-code.js'
import { readJsonFile } from '../../../src/fs.js'
import {
  ENDO_POLICY_BOILERPLATE,
  ENDO_POLICY_ENTRY_TRUSTED,
  toEndoPolicy,
} from '../../../src/policy-converter.js'
import { mergePolicies, readPolicy } from '../../../src/policy-util.js'

/**
 * @import {Policy} from '@endo/compartment-mapper'
 * @import {LavaMoatEndoPackagePolicyItem, MergedLavaMoatPolicy} from '../../../src/types.js'
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
const DEFAULT_POLICY = Object.freeze(
  /** @type {const} */ ({
    resources: {},
  })
)
/** @satisfies {MergedLavaMoatPolicy} */
const DEFAULT_MERGED_POLICY = Object.freeze(
  /** @type {const} */ ({
    resources: {},
    [MERGED_POLICY_FIELD]: true,
  })
)

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
    code: ErrorCodes.NoPolicy,
  })
})

test('toEndoPolicy() - empty policy', async (t) => {
  const actual = await toEndoPolicy(DEFAULT_MERGED_POLICY)
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
    code: ErrorCodes.InvalidPolicy,
  })
})

test('toEndoPolicy() - invalid policy (by path)', async (t) => {
  await t.throwsAsync(toEndoPolicy(INVALID_POLICY_URL), {
    code: ErrorCodes.InvalidPolicy,
  })
})

test('toEndoPolicy() - invalid policy override', async (t) => {
  const lmPolicyOverride = [1, 2, 3]

  await t.throwsAsync(
    // @ts-expect-error invalid type
    toEndoPolicy(DEFAULT_POLICY, {
      policyOverride: lmPolicyOverride,
    }),
    { code: ErrorCodes.InvalidPolicy }
  )
})

test('toEndoPolicy() - invalid policy override (by path)', async (t) => {
  await t.throwsAsync(
    toEndoPolicy(DEFAULT_POLICY, {
      policyOverridePath: INVALID_POLICY_URL,
    }),
    { code: ErrorCodes.InvalidPolicy }
  )
})

test('toEndoPolicy() - override merging', async (t) => {
  const policy = await toEndoPolicy(KS_POLICY_URL, {
    policyOverridePath: KS_POLICY_OVERRIDES_URL,
  })
  const actual = compactJSON(policy)

  const expected = await readJsonFile(
    new URL(
      './conversion-fixture/kitchen-sink/endo-policy-overrides.json',
      import.meta.url
    )
  )

  t.deepEqual(actual, expected)
})

test('toEndoPolicy() - no override merging', async (t) => {
  const lavamoatPolicy = await readPolicy(KS_POLICY_URL)
  const mergedPolicy = mergePolicies(lavamoatPolicy)
  // @ts-expect-error invalid type
  const endoPolicy = await toEndoPolicy(mergedPolicy, {
    policyOverridePath: KS_POLICY_OVERRIDES_URL,
  })
  const actual = compactJSON(endoPolicy)

  const expected = await readJsonFile(
    new URL(
      './conversion-fixture/kitchen-sink/endo-policy.json',
      import.meta.url
    )
  )

  t.deepEqual(actual, expected)
})
