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

import { execute } from './compartment-map.js'
import { toEndoPolicy } from './policy-converter.js'
import { generatePolicy } from './policy-gen/index.js'
import { isPolicy } from './policy.js'
import { makeReadPowers } from './power.js'

export * as constants from './constants.js'
export { generateAndWritePolicy, generatePolicy } from './policy-gen/index.js'
export { loadPolicies } from './policy.js'
export { toEndoPolicy }

/**
 * Runs a module or script with provided LavaMoat policy
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @overload
 * @param {string | URL} entrypointPath
 * @param {import('lavamoat-core').LavaMoatPolicy} policy
 * @param {import('./types.js').RunOptions} [opts]
 * @returns {Promise<T>}
 */

/**
 * Runs a module or script using an auto-generated policy, optionally writing to
 * disk
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @overload
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').GenerateAndRunOptions} [opts]
 * @returns {Promise<T>}
 */

/**
 * Runs a module or script
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @param {string | URL} entrypointPath
 * @param {import('lavamoat-core').LavaMoatPolicy
 *   | import('./types.js').GenerateAndRunOptions} [policyOrOpts]
 * @param {import('./types.js').RunOptions} [opts]
 * @returns {Promise<T>}
 */
export async function run(entrypointPath, policyOrOpts, opts = {}) {
  await Promise.resolve()
  /** @type {import('lavamoat-core').LavaMoatPolicy} */
  let policy
  /** @type {import('./types.js').RunOptions} */
  let runOpts

  if (isPolicy(policyOrOpts)) {
    policy = policyOrOpts
    runOpts = opts
  } else {
    const generateOpts =
      policyOrOpts ??
      /** @type {import('./types.js').GenerateAndRunOptions} */ ({})
    runOpts = { readPowers: generateOpts.readPowers }
    policy = await generatePolicy(entrypointPath, generateOpts)
  }

  const readPowers = makeReadPowers(runOpts.readPowers)

  return execute(readPowers, entrypointPath, policy)
}
