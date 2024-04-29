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
import { importHook, importNowHook } from './import-hook.js'
import { syncModuleTransforms } from './module-transforms.js'
import { toEndoPolicy } from './policy-converter.js'
import { generatePolicy } from './policy-gen/index.js'
import { isPolicy } from './policy.js'
import { makeReadPowers } from './power.js'

export * as constants from './constants.js'
export { generateAndWritePolicy, generatePolicy } from './policy-gen/index.js'
export { loadPolicies } from './policy.js'
export { toEndoPolicy }

/**
 * Runs Endomoat with provided policy
 *
 * @overload
 * @param {string | URL} entryFile
 * @param {import('lavamoat-core').LavaMoatPolicy} policy
 * @param {import('./types.js').RunOptions} [opts]
 * @returns {Promise<unknown>}
 */

/**
 * Runs Endomoat with an auto-generated policy, optionally writing to disk
 *
 * @overload
 * @param {string | URL} entryFile
 * @param {import('./types.js').GenerateAndRunOptions} [opts]
 * @returns {Promise<unknown>}
 */

/**
 * Runs a program in Endomoat
 *
 * @param {string | URL} entrypointPath
 * @param {import('lavamoat-core').LavaMoatPolicy
 *   | import('./types.js').GenerateAndRunOptions} [policyOrOpts]
 * @param {import('./types.js').RunOptions} [opts]
 * @returns {Promise<unknown>}
 */
export async function run(entrypointPath, policyOrOpts = {}, opts = {}) {
  await Promise.resolve()
  /** @type {import('lavamoat-core').LavaMoatPolicy} */
  let policy
  /** @type {import('./types.js').RunOptions} */
  let runOpts

  if (isPolicy(policyOrOpts)) {
    policy = policyOrOpts
    runOpts = opts
  } else {
    const generateOpts = policyOrOpts
    runOpts = { readPowers: generateOpts.readPowers }
    policy = await generatePolicy(entrypointPath, generateOpts)
  }

  const endoPolicy = await toEndoPolicy(policy)
  const readPowers = makeReadPowers(runOpts.readPowers)

  const url =
    entrypointPath instanceof URL
      ? `${entrypointPath}`
      : `${pathToFileURL(entrypointPath)}`

  /**
   * @type {import('@endo/compartment-mapper').SyncArchiveOptions &
   *   import('@endo/compartment-mapper').ExecuteOptions}
   */
  const importOpts = {
    policy: endoPolicy,
    globals: globalThis,
    importHook,
    dynamicHook: importNowHook,
    syncModuleTransforms,
    fallbackLanguageForExtension: {
      node: 'bytes',
    },
  }

  const { namespace } = await importLocation(readPowers, url, importOpts)

  return namespace
}
