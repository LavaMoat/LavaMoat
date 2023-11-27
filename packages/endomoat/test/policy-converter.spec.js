import 'ses'

import test from 'ava'
import { ENDO_ROOT_POLICY, ENDO_WILDCARD_POLICY } from '../src/index.js'
import { toEndoPolicy } from '../src/policy-converter.js'

/**
 * @typedef {import('@endo/compartment-mapper').PolicyItem & import('../src/policy-converter.js').RootPolicy} LavaMoatPackagePolicyItem
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
      globals: [ENDO_ROOT_POLICY],
      noGlobalFreeze: true,
      packages: ENDO_WILDCARD_POLICY,
      builtins: ENDO_WILDCARD_POLICY,
    },
    resources: {
      '@lavamoat/endomoat': {
        globals: ENDO_WILDCARD_POLICY,
        packages: ENDO_WILDCARD_POLICY,
        builtins: ENDO_WILDCARD_POLICY,
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
