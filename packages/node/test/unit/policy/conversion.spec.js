import '../../../src/preamble.js'

import test from 'ava'
import stringify from 'json-stable-stringify'
import { readJsonFile } from '../../../src/fs.js'
import {
  loadPolicy,
  policyInput,
  policyOverrideNone,
  policyOverrideSourceFromFile,
  policySourceFromFile,
} from '../../../src/policy-input.js'
import {
  ENDO_POLICY_BOILERPLATE,
  ENDO_POLICY_ENTRY_TRUSTED,
  toEndoPolicy,
} from '../../../src/policy-converter.js'
import { readPolicy, wrapMerged } from '../../../src/policy-util.js'

/**
 * @import {Policy} from "@endo/compartment-mapper"
 * @import {LavaMoatPolicy} from "@lavamoat/types"
 * @import {LavaMoatEndoPackagePolicyItem} from "../../../src/types.js"
 */

const KS_POLICY_URL = new URL(
  './conversion-fixture/kitchen-sink/policy.json',
  import.meta.url
)
const KS_POLICY_OVERRIDES_URL = new URL(
  './conversion-fixture/kitchen-sink/policy-overrides.json',
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

test('toEndoPolicy() - empty policy (wrapMerged)', async (t) => {
  const merged = wrapMerged(DEFAULT_POLICY)
  const actual = await toEndoPolicy(merged)
  t.deepEqual(actual, ENDO_POLICY_TRUSTED)
})

test('toEndoPolicy() - no overrides (kitchen sink via loadPolicy)', async (t) => {
  const merged = await loadPolicy(
    policyInput({
      policy: policySourceFromFile(KS_POLICY_URL),
      override: policyOverrideNone(),
    })
  )
  const actual = compactJSON(await toEndoPolicy(merged))

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

test('toEndoPolicy() - override merging (kitchen sink via loadPolicy)', async (t) => {
  const merged = await loadPolicy(
    policyInput({
      policy: policySourceFromFile(KS_POLICY_URL),
      override: policyOverrideSourceFromFile(KS_POLICY_OVERRIDES_URL),
    })
  )
  const actual = compactJSON(await toEndoPolicy(merged))

  const expected = await readJsonFile(
    new URL(
      './conversion-fixture/kitchen-sink/endo-policy-overrides.json',
      import.meta.url
    )
  )

  t.deepEqual(actual, expected)
})

test('toEndoPolicy() - empty policy file via loadPolicy', async (t) => {
  const merged = await loadPolicy(
    policyInput({
      policy: policySourceFromFile(EMPTY_POLICY_URL),
      override: policyOverrideNone(),
    })
  )
  const actual = await toEndoPolicy(merged)
  t.deepEqual(actual, ENDO_POLICY_TRUSTED)
})

test('toEndoPolicy() - no override merging when already merged', async (t) => {
  // When the policy is pre-merged (no overrides), the conversion output should
  // match the no-overrides kitchen-sink endo policy.
  const lavamoatPolicy = await readPolicy(KS_POLICY_URL)
  const merged = wrapMerged(lavamoatPolicy)
  const endoPolicy = await toEndoPolicy(merged)
  const actual = compactJSON(endoPolicy)

  const expected = await readJsonFile(
    new URL(
      './conversion-fixture/kitchen-sink/endo-policy.json',
      import.meta.url
    )
  )

  t.deepEqual(actual, expected)
})

test('toEndoPolicy() - throws for non-Merged input (undefined)', async (t) => {
  // @ts-expect-error intentionally invalid
  await t.throwsAsync(toEndoPolicy(undefined))
})

test('toEndoPolicy() - throws for non-Merged input (plain policy)', async (t) => {
  // @ts-expect-error intentionally invalid
  await t.throwsAsync(toEndoPolicy(DEFAULT_POLICY))
})
