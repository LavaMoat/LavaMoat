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
import { defaultReadPowers } from '../compartment/power.js'
import {
  DEFAULT_POLICY_DEBUG_PATH,
  DEFAULT_POLICY_PATH,
  DEFAULT_TRUST_ROOT_COMPARTMENT,
} from '../constants.js'
import { log as defaultLog } from '../log.js'
import { writePolicy } from '../policy-util.js'
import { devToConditions, hrPath } from '../util.js'
import { loadCompartmentMap } from './policy-gen-compartment-map.js'
import { compartmentMapToPolicy } from './to-policy.js'

/**
 * @import {GenerateOptions, LoadCompartmentMapOptions} from '../internal.js'
 * @import {GeneratePolicyOptions, CompartmentMapToPolicyOptions, IsAbsoluteFn} from '../types.js'
 * @import {LavaMoatPolicy, LavaMoatPolicyDebug} from 'lavamoat-core'
 * @import {SetFieldType} from 'type-fest'
 */

/** @type {IsAbsoluteFn} */
const defaultIsAbsolute = nodePath.isAbsolute

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
 * @param {string | URL} entrypoint
 * @param {GenerateOptions} [opts]
 * @returns {Promise<LavaMoatPolicy>}
 */
const generate = async (
  entrypoint,
  {
    readPowers = defaultReadPowers,
    debug = false,
    policyOverride,
    isBuiltin,
    log = defaultLog,
    dev = false,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    ...archiveOpts
  } = {}
) => {
  const conditions = devToConditions(dev)

  /** @type {LoadCompartmentMapOptions} */
  const loadCompartmentMapOptions = {
    ...archiveOpts,
    log,
    readPowers,
    conditions,
    policyOverride,
  }
  const { compartmentMap, sources, renames } = await loadCompartmentMap(
    entrypoint,
    loadCompartmentMapOptions
  )

  /** @type {CompartmentMapToPolicyOptions} */
  const baseOpts = {
    readPowers,
    policyOverride,
    isBuiltin,
    log,
    trustRoot,
  }

  // this weird thing is to make TS happy about the overload
  const opts = debug ? { debug: true, ...baseOpts } : baseOpts

  return compartmentMapToPolicy(
    entrypoint,
    compartmentMap,
    sources,
    renames,
    opts
  )
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
 * @param {string | URL} entrypoint
 * @param {GeneratePolicyOptions} [opts]
 * @returns {Promise<LavaMoatPolicy>}
 * @public
 */
export const generatePolicy = async (
  entrypoint,
  {
    policyDebugPath = ABS_POLICY_DEBUG_PATH,
    policyPath = ABS_POLICY_PATH,
    writableFs = nodeFs,
    readPowers = defaultReadPowers,
    isAbsolute = defaultIsAbsolute,
    write: shouldWrite = false,
    debug,
    log = defaultLog,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    ...generateOpts
  } = {}
) => {
  await Promise.resolve()

  if (entrypoint instanceof URL) {
    entrypoint = readPowers.fileURLToPath(entrypoint)
  }
  assert(
    isAbsolute(entrypoint),
    `entrypointPath must be an absolute path; got ${entrypoint}`
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

  const niceEntrypointPath = hrPath(entrypoint)

  /**
   * If the debug flag was true, then the result of generatePolicy will be a
   * `LavaMoatPolicyDebug`. we will write that entire thing to the debug policy,
   * then extract everything except the `debugInfo` prop, and write _that_ to
   * {@link policy}
   */
  if (shouldWriteDebugPolicy({ write: shouldWrite, debug })) {
    log.info(`Generating "debug" LavaMoat policy from ${niceEntrypointPath}`)
    const debugPolicy = await generate(entrypoint, {
      ...generateOpts,
      readPowers,
      trustRoot: trustRoot,
      debug: true,
    })
    await writePolicy(policyDebugPath, debugPolicy, { fs: writableFs })
    const nicePolicyDebugPath = hrPath(policyDebugPath)
    log.info(`Wrote debug policy to ${nicePolicyDebugPath} successfully`)
    // do not attempt to use the `delete` keyword with typescript. you have been
    // warned!
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { debugInfo: _, ...corePolicy } = /** @type {LavaMoatPolicyDebug} */ (
      debugPolicy
    )
    policy = corePolicy
  } else {
    log.info(`Generating LavaMoat policy from ${niceEntrypointPath}`)
    policy = await generate(entrypoint, {
      ...generateOpts,
      trustRoot: trustRoot,
      readPowers,
    })
  }

  if (shouldWrite) {
    await writePolicy(policyPath, policy, { fs: writableFs })
  }

  return policy
}
