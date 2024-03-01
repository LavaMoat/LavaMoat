import 'ses'

import test from 'ava'
import { POLICY_ITEM_ROOT, POLICY_ITEM_WILDCARD } from '../src/constants.js'
import { toEndoPolicy } from '../src/policy-converter.js'

/**
 * @typedef {import('@endo/compartment-mapper').PolicyItem &
 *   import('../src/types.js').RootPolicy} LavaMoatPackagePolicyItem
 */

test('toEndoPolicy - basic', (t) => {
  /** @type {import('lavamoat-core').LavaMoatPolicy} */
  const lmPolicy = {
    resources: {
      a: {
        packages: {
          b: true,
        },
        globals: {
          console: true,
        },
        builtin: {
          'fs.readFile': true,
        },
      },
    },
  }
  /**
   * @type {import('@endo/compartment-mapper').Policy<LavaMoatPackagePolicyItem>}
   */
  const expected = {
    defaultAttenuator: '@lavamoat/endomoat/attenuator',
    entry: {
      globals: [POLICY_ITEM_ROOT],
      noGlobalFreeze: true,
      packages: POLICY_ITEM_WILDCARD,
      builtins: POLICY_ITEM_WILDCARD,
    },
    resources: {
      '@lavamoat/endomoat': {
        globals: POLICY_ITEM_WILDCARD,
        packages: POLICY_ITEM_WILDCARD,
        builtins: POLICY_ITEM_WILDCARD,
      },
      a: {
        packages: { b: true },
        globals: { console: true },
        builtins: {
          fs: {
            attenuate: '@lavamoat/endomoat/attenuator',
            params: ['readFile'],
          },
        },
      },
    },
  }

  t.deepEqual(toEndoPolicy(lmPolicy), expected)
})
