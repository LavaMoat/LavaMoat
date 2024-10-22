/**
 * Provides Lavamoat policy generation facilities via {@link generatePolicy}
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */
import assert from 'node:assert'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { loadCompartmentMap } from '../compartment-map.js'
import { DEFAULT_POLICY_DEBUG_PATH, DEFAULT_POLICY_PATH } from '../constants.js'
import { defaultReadPowers } from '../power.js'
import { writePolicy } from '../util.js'
import { compartmentMapToPolicy } from './to-policy.js'

/**
 * @import {GenerateOptions, GeneratePolicyOptions, CompartmentMapToPolicyOptions} from '../types.js'
 * @import {LavaMoatPolicy, LavaMoatPolicyDebug} from 'lavamoat-core'
 * @import {SetFieldType} from 'type-fest'
 */

/**
 * Generates a LavaMoat debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @overload
 * @param {string | URL} entrypointPath
 * @param {SetFieldType<GenerateOptions, 'debug', true>} opts
 * @returns {Promise<LavaMoatPolicyDebug>}
 */

/**
 * Generates a LavaMoat policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @overload
 * @param {string | URL} entrypointPath
 * @param {GenerateOptions} [opts]
 * @returns {Promise<LavaMoatPolicy>}
 */

/**
 * Generates a LavaMoat policy or debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypointPath
 * @param {GenerateOptions} [opts]
 * @returns {Promise<LavaMoatPolicy>}
 */
const generate = async (
  entrypointPath,
  {
    readPowers = defaultReadPowers,
    debug = false,
    policyOverride,
    isBuiltin,
    ...archiveOpts
  } = {}
) => {
  const { compartmentMap, sources, renames } = await loadCompartmentMap(
    entrypointPath,
    {
      ...archiveOpts,
      readPowers,
      policyOverride,
    }
  )

  /** @type {CompartmentMapToPolicyOptions} */
  const baseOpts = { readPowers, policyOverride, isBuiltin }

  // this weird thing is to make TS happy about the overload
  const opts = debug ? { debug: true, ...baseOpts } : baseOpts

  return compartmentMapToPolicy(compartmentMap, sources, renames, opts)
}

/**
 * Returns `true` if we should write a debug policy
 *
 * @param {Pick<GeneratePolicyOptions, 'write' | 'debug'>} [opts]
 * @returns {boolean}
 */
const shouldWriteDebugPolicy = (opts = {}) => !!(opts.write && opts.debug)

/**
 * Absolute path to the default policy debug file
 */
const ABS_POLICY_DEBUG_PATH = nodePath.resolve(DEFAULT_POLICY_DEBUG_PATH)

/**
 * Absolute path to the default policy file
 */
const ABS_POLICY_PATH = nodePath.resolve(DEFAULT_POLICY_PATH)

/**
 * Generates a LavaMoat policy or debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypointPath
 * @param {GeneratePolicyOptions} [opts]
 * @returns {Promise<LavaMoatPolicy>}
 * @public
 */
export const generatePolicy = async (
  entrypointPath,
  {
    policyDebugPath = ABS_POLICY_DEBUG_PATH,
    policyPath = ABS_POLICY_PATH,
    writableFs = nodeFs,
    readPowers = defaultReadPowers,
    isAbsolute = nodePath.isAbsolute,
    write: shouldWrite = false,
    debug,
    ...generateOpts
  } = {}
) => {
  await Promise.resolve()

  if (entrypointPath instanceof URL) {
    entrypointPath = readPowers.fileURLToPath(entrypointPath)
  }
  assert(
    isAbsolute(entrypointPath),
    `entrypointPath must be an absolute path; got ${entrypointPath}`
  )
  if (shouldWrite) {
    assert(
      isAbsolute(policyPath),
      `policyPath must be an absolute path; got ${policyPath}`
    )
    if (policyDebugPath) {
      assert(
        isAbsolute(policyDebugPath),
        `policyDebugPath must be an absolute path; got ${policyDebugPath}`
      )
    }
  }

  /**
   * This value will be returned once populated
   *
   * @type {LavaMoatPolicy}
   */
  let policy

  /**
   * If the debug flag was true, then the result of generatePolicy will be a
   * `LavaMoatPolicyDebug`. we will write that entire thing to the debug policy,
   * then extract everything except the `debugInfo` prop, and write _that_ to
   * {@link policy}
   */
  if (shouldWriteDebugPolicy({ write: shouldWrite, debug })) {
    const debugPolicy = await generate(entrypointPath, {
      ...generateOpts,
      readPowers,
      debug: true,
    })
    await writePolicy(policyDebugPath, debugPolicy, { fs: writableFs })

    // do not attempt to use the `delete` keyword with typescript. you have been
    // warned!
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { debugInfo: _, ...corePolicy } = /** @type {LavaMoatPolicyDebug} */ (
      debugPolicy
    )
    policy = corePolicy
  } else {
    policy = await generate(entrypointPath, { ...generateOpts, readPowers })
  }

  if (shouldWrite) {
    await writePolicy(policyPath, policy, { fs: writableFs })
  }

  return policy
}
