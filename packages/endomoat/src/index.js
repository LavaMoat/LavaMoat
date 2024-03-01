import 'ses'
lockdown({
  // gives a semi-high resolution timer
  dateTaming: 'unsafe',
  // this is introduces non-determinism, but is otherwise safe
  mathTaming: 'unsafe',
  // lets code observe call stack, but easier debuggability
  errorTaming: 'unsafe',
  // shows the full call stack
  stackFiltering: 'verbose',
  // prevents most common override mistake cases from tripping up users
  overrideTaming: 'severe',
  // preserves JS locale methods, to avoid confusing users
  // prevents aliasing: toLocaleString() to toString(), etc
  localeTaming: 'unsafe',
})

import { importLocation } from '@endo/compartment-mapper'
import { pathToFileURL } from 'node:url'
import { importHook } from './import-hook.js'
import { moduleTransforms } from './module-transforms.js'
import { toEndoPolicy } from './policy-converter.js'
import { defaultReadPowers } from './power.js'

export * as constants from './constants.js'
export { loadPolicies } from './policy.js'
export { toEndoPolicy }

/**
 * Runs a program in Endomoat with the provided policy
 *
 * @param {string | URL} entrypointPath
 * @param {import('lavamoat-core').LavaMoatPolicy} policy
 * @param {import('./types.js').RunOptions} [opts]
 * @returns {Promise<unknown>}
 */
export async function run(entrypointPath, policy, opts = {}) {
  const endoPolicy = toEndoPolicy(policy)
  const { readPowers = defaultReadPowers } = opts

  const url =
    entrypointPath instanceof URL
      ? `${entrypointPath}`
      : `${pathToFileURL(entrypointPath)}`

  const { namespace } = await importLocation(readPowers, url, {
    policy: endoPolicy,
    globals: globalThis,
    importHook,
    moduleTransforms,
  })

  return namespace
}
