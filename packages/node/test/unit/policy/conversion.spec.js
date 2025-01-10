import '../../../src/preamble.js'

import test from 'ava'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_ATTENUATOR,
  ENDO_PKG_POLICY_BUILTINS,
  ENDO_PKG_POLICY_GLOBALS,
  ENDO_PKG_POLICY_OPTION_NATIVE,
  ENDO_PKG_POLICY_OPTIONS,
  ENDO_PKG_POLICY_PACKAGES,
  ENDO_POLICY_ITEM_ATTENUATE,
  ENDO_POLICY_ITEM_PARAMS,
  ENDO_POLICY_RESOURCES,
} from '../../../src/constants.js'
import {
  ENDO_POLICY_BOILERPLATE,
  toEndoPolicy,
} from '../../../src/policy-converter.js'

/**
 * @import {Policy} from '@endo/compartment-mapper'
 * @import {LavaMoatPackagePolicyItem} from '../../../src/types.js'
 * @import {LavaMoatPolicy, LavaMoatPolicyOverrides} from '@lavamoat/types'
 */

test('toEndoPolicy() - kitchen sink', async (t) => {
  // this should test all the various bits of a lavamoat policy

  const lmPolicyUrl = new URL(
    './conversion-fixture/kitchen-sink.json',
    import.meta.url
  )

  /**
   * @type {Policy<LavaMoatPackagePolicyItem>}
   */
  const expected = {
    ...ENDO_POLICY_BOILERPLATE,
    [ENDO_POLICY_RESOURCES]: {
      a: {
        [ENDO_PKG_POLICY_PACKAGES]: { b: true },
        [ENDO_PKG_POLICY_GLOBALS]: [{ console: true }],
        [ENDO_PKG_POLICY_BUILTINS]: {
          fs: {
            [ENDO_POLICY_ITEM_ATTENUATE]: DEFAULT_ATTENUATOR,
            [ENDO_POLICY_ITEM_PARAMS]: ['readFile'],
          },
        },
        [ENDO_PKG_POLICY_OPTIONS]: undefined,
      },
      'a>b': {
        [ENDO_PKG_POLICY_BUILTINS]: undefined,
        [ENDO_PKG_POLICY_OPTIONS]: {
          [ENDO_PKG_POLICY_OPTION_NATIVE]: true,
        },
        [ENDO_PKG_POLICY_PACKAGES]: undefined,
        [ENDO_PKG_POLICY_GLOBALS]: [{ XMLHttpRequest: 'write' }],
      },
    },
  }

  const actual = await toEndoPolicy(lmPolicyUrl)

  // this may be stable; if it is, use a snapshot maybe
  t.deepEqual(actual, expected)
})

test('toEndoPolicy() - no policy', async (t) => {
  const lmPolicy = undefined

  await t.throwsAsync(toEndoPolicy(/** @type {any} */ (lmPolicy)), {
    message: 'Expected a policy or policy path',
  })
})

test('toEndoPolicy() - empty policy', async (t) => {
  /** @type {LavaMoatPolicy} */
  const lmPolicy = { resources: {} }

  const actual = await toEndoPolicy(lmPolicy)
  t.deepEqual(actual, ENDO_POLICY_BOILERPLATE)
})

test('toEndoPolicy() - policy path as URL', async (t) => {
  const lmPolicyUrl = new URL(
    './conversion-fixture/empty.json',
    import.meta.url
  )

  const actual = await toEndoPolicy(lmPolicyUrl)
  t.deepEqual(actual, ENDO_POLICY_BOILERPLATE)
})

test('toEndoPolicy() - policy path as string', async (t) => {
  const lmPolicyPath = fileURLToPath(
    new URL('./conversion-fixture/empty.json', import.meta.url)
  )

  const actual = await toEndoPolicy(lmPolicyPath)
  t.deepEqual(actual, ENDO_POLICY_BOILERPLATE)
})

test('toEndoPolicy() - invalid policy', async (t) => {
  await t.throwsAsync(toEndoPolicy(/** @type {any} */ ([1, 2, 3])), {
    message: 'Invalid LavaMoat policy',
  })
})

test('toEndoPolicy() - invalid policy override', async (t) => {
  /** @type {LavaMoatPolicy} */
  const lmPolicy = { resources: {} }

  /** @type {LavaMoatPolicyOverrides} */
  const lmPolicyOverride = /** @type {any} */ ([1, 2, 3])

  await t.throwsAsync(
    toEndoPolicy(lmPolicy, {
      policyOverride: lmPolicyOverride,
    }),
    { message: 'Invalid LavaMoat policy overrides' }
  )
})

test('toEndoPolicy() - path to invalid policy override', async (t) => {
  /** @type {LavaMoatPolicy} */
  const lmPolicy = { resources: {} }

  const lmPolicyOverridePath = new URL(
    './conversion-fixture/invalid.json',
    import.meta.url
  )

  await t.throwsAsync(
    toEndoPolicy(lmPolicy, {
      policyOverridePath: lmPolicyOverridePath,
    }),
    { message: 'Invalid LavaMoat policy overrides' }
  )
})

test('toEndoPolicy() - merging', async (t) => {
  const lmPolicyUrl = new URL(
    './conversion-fixture/kitchen-sink.json',
    import.meta.url
  )
  const lmPolicyOverrideUrl = new URL(
    './conversion-fixture/kitchen-sink-override.json',
    import.meta.url
  )

  const actual = await toEndoPolicy(lmPolicyUrl, {
    policyOverridePath: lmPolicyOverrideUrl,
  })

  /**
   * @type {Policy<LavaMoatPackagePolicyItem>}
   */
  const expected = {
    ...ENDO_POLICY_BOILERPLATE,
    [ENDO_POLICY_RESOURCES]: {
      a: {
        [ENDO_PKG_POLICY_PACKAGES]: { b: true },
        [ENDO_PKG_POLICY_GLOBALS]: [{ console: true }],
        [ENDO_PKG_POLICY_BUILTINS]: {
          fs: {
            [ENDO_POLICY_ITEM_ATTENUATE]: DEFAULT_ATTENUATOR,
            [ENDO_POLICY_ITEM_PARAMS]: ['readFile'],
          },
        },
        [ENDO_PKG_POLICY_OPTIONS]: undefined,
      },
      'a>b': {
        [ENDO_PKG_POLICY_BUILTINS]: undefined,
        [ENDO_PKG_POLICY_OPTIONS]: {
          [ENDO_PKG_POLICY_OPTION_NATIVE]: true,
        },
        [ENDO_PKG_POLICY_PACKAGES]: { c: true },
        [ENDO_PKG_POLICY_GLOBALS]: [{ XMLHttpRequest: 'write' }],
      },
      c: {
        [ENDO_PKG_POLICY_BUILTINS]: { 'node:fs': true },
        [ENDO_PKG_POLICY_OPTIONS]: undefined,
        [ENDO_PKG_POLICY_PACKAGES]: undefined,
        [ENDO_PKG_POLICY_GLOBALS]: undefined,
      },
    },
  }

  t.deepEqual(actual, expected)
})
