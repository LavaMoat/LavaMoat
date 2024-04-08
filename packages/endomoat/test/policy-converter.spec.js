import 'ses'

import test from 'ava'
import { POLICY_ITEM_ROOT, POLICY_ITEM_WILDCARD } from '../src/constants.js'
import { toEndoPolicy } from '../src/policy-converter.js'

/**
 * @typedef {import('@endo/compartment-mapper').PolicyItem &
 *   import('../src/types.js').RootPolicy} LavaMoatPackagePolicyItem
 */

test('toEndoPolicy - basic', async (t) => {
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
      'lavamoat-core': {
        globals: {
          'console.warn': true,
        },
        builtins: undefined,
        packages: undefined,
      },
      '@lavamoat/endomoat': {
        packages: {
          'lavamoat-core': true,
        },
        globals: undefined,
        builtins: {
          'node:console': true,
          'node:path': true,
        },
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

  const actual = await toEndoPolicy(lmPolicy)
  t.deepEqual(actual, expected)
})
