import nodeCrypto from 'node:crypto'
import nodePath from 'node:path'
import nodeUrl from 'node:url'
import { execute } from './compartment-map.js'
import { generatePolicy } from './policy-gen/index.js'
import { isPolicy } from './policy.js'
import { defaultReadPowers, makeReadPowers } from './power.js'

/**
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 * @import {GenerateAndRunOptions, RunOptions} from './types.js';
 * @import {ReadNowPowers} from '@endo/compartment-mapper';
 */

/**
 * Runs a module or script with provided LavaMoat policy
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @overload
 * @param {string | URL} entrypointPath
 * @param {LavaMoatPolicy} policy
 * @param {RunOptions} [opts]
 * @returns {Promise<T>}
 */

/**
 * Runs a module or script using an auto-generated policy, optionally writing to
 * disk
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @overload
 * @param {string | URL} entrypointPath
 * @param {GenerateAndRunOptions} [opts]
 * @returns {Promise<T>}
 */

/**
 * Runs a module or script
 *
 * @template [T=unknown] Exports of module, if known. Default is `unknown`
 * @param {string | URL} entrypointPath
 * @param {LavaMoatPolicy | GenerateAndRunOptions} [policyOrOpts]
 * @param {RunOptions} [options]
 * @returns {Promise<T>}
 * @public
 */
export const run = async (entrypointPath, policyOrOpts, options = {}) => {
  await Promise.resolve()
  /** @type {LavaMoatPolicy} */
  let policy
  /** @type {RunOptions} */
  let runOpts

  if (isPolicy(policyOrOpts)) {
    policy = policyOrOpts
    runOpts = options
  } else {
    const generateOpts =
      policyOrOpts ?? /** @type {GenerateAndRunOptions} */ ({})
    runOpts = { readPowers: generateOpts.readPowers }
    policy = await generatePolicy(entrypointPath, generateOpts)
  }

  // 'fs' is the minimum required to create new read powers.
  // if we didn't have at least that, then we could just use `defaultReadPowers`.
  // also note: `fs` has precedence over `readPowers`
  const readPowers = runOpts.fs
    ? makeReadPowers(
        runOpts.fs,
        runOpts.url ?? nodeUrl,
        runOpts.path ?? nodePath,
        runOpts.crypto ?? nodeCrypto
      )
    : (runOpts.readPowers ?? defaultReadPowers)

  return execute(readPowers, entrypointPath, policy)
}