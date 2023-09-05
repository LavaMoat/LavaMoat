const test = require('ava').default
const {toEndoPolicy, ROOT_POLICY, WRITE_POLICY, ANY_POLICY} = require('../src')

/**
 * @typedef {import('@endo/compartment-mapper').PolicyItem & import('../src').RootPolicy} LavaMoatPackagePolicyItem
 */

test('toEndoPolicy - basic', (t) => {
  /** @type {import('lavamoat-core/schema').LavaMoatPolicySchema} */
  const lmPolicy = {
    resources: {
      a: {
        packages: {
          'b': true,
        },
        globals: {
          'console': true,
        },
        builtins: {
          'fs.readFile': true,
        },
      },
    },
  }
  /**
   * @type {import('@endo/compartment-mapper').Policy<LavaMoatPackagePolicyItem>}
   */
  const expected = {
    defaultAttenuator: '@lavamoat/endomoat/attenuator/default',
    entry: {
      globals: [ROOT_POLICY],
      noGlobalFreeze: true,
      packages: ANY_POLICY,
      builtins: ANY_POLICY,
    },
    resources: {
      a: {
        packages: {b: true},
        globals: {console: true},
        builtins: {
          fs: {
            attenuate: '@lavamoat/endomoat/attenuator/property',
            params: ['readFile'],
          },
        },
      },
    },
  }

  t.deepEqual(toEndoPolicy(lmPolicy), expected)
})
